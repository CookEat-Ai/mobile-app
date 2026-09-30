const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const i18next = require('i18next');
const root = path.resolve(__dirname, '..');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'services/paywallCopy.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsObject });
const { resolvePaywallCopy } = exportsObject;
const goals = ['lose_weight', 'gain_muscle', 'maintain', 'balanced'];
(async () => {
  for (const locale of ['fr', 'en', 'de', 'es-ES', 'es-MX', 'pt-BR']) {
    const strings = JSON.parse(fs.readFileSync(path.join(root, `locales/${locale}.json`), 'utf8'));
    const i18n = i18next.createInstance();
    await i18n.init({ lng: locale, fallbackLng: false, resources: { [locale]: { translation: strings } } });
    const goalTestimonials = { lose_weight: 'regularity', gain_muscle: 'macros', maintain: 'planning', balanced: 'simplicity' };
    const supplied = ['regularity', 'macros', 'simplicity', 'time', 'planning', 'training'];
    assert.equal(new Set(supplied.map(id => strings.testimonials[id].text)).size, 6);
    assert.equal(new Set(supplied.map(id => strings.testimonials[id].author)).size, 6);
    assert.equal(strings.onboarding.socialProof.reviewAuthor, 'Julien Arman');
    const resolve = (profile, metadata = {}, entryFeature = 'generate') => resolvePaywallCopy({
      profile, entryFeature, offering: { metadata }, language: locale, t: i18n.t.bind(i18n),
    });
    const generic = resolve(null);
    assert.equal(generic.headline, strings.paywall.weeklyPlanning.headline);
    assert.equal(generic.subheadline, strings.paywall.weeklyPlanning.subheadline);
    assert.equal(generic.personalizationSegment, 'entry_generate');
    const headlines = new Set();
    for (const goal of goals) {
      const profile = { goal, cookingTime: '' };
      const copy = resolve(profile);
      const expected = strings.paywall.weeklyPlanning.goals[goal];
      assert.equal(copy.headline, expected.headline);
      assert.equal(copy.subheadline, expected.subheadline);
      assert.notEqual(copy.headline, generic.headline);
      assert.equal(copy.testimonialKey, `fitnessOnboarding.social.reviews.${goal}.text`);
      assert(i18n.exists(copy.testimonialKey));
      const testimonial = strings.testimonials[goalTestimonials[goal]];
      assert.equal(i18n.t(copy.testimonialKey), testimonial.text);
      const attribution = i18n.t(copy.testimonialKey.replace(/\.text$/, '.author'));
      assert.equal(attribution, testimonial.author);
      assert(!i18n.t(copy.testimonialKey).includes('$t('));
      assert.equal(copy.personalizationSegment, `goal_${goal}`);
      headlines.add(copy.headline);
      for (const entryFeature of ['generate', 'import']) {
        const quick = resolve({ ...profile, cookingTime: 'less_than_30_minutes' }, {}, entryFeature);
        assert.equal(quick.subheadline, `${expected.subheadline} ${strings.paywall.personalization.focus.quick}`);
      }
      const remoteGeneric = resolve(profile, { weeklyPlanning: { headline: 'Generic campaign', subheadline: 'Generic message' } });
      assert.equal(remoteGeneric.headline, copy.headline);
      assert.equal(remoteGeneric.subheadline, copy.subheadline);
      const remoteGoal = resolve(profile, { weeklyPlanning: { goals: { [goal]: { headline: { [locale]: 'Specific goal campaign' } } } } });
      assert.equal(remoteGoal.headline, 'Specific goal campaign');
      assert.equal(remoteGoal.subheadline, copy.subheadline);
      const emptyRemote = resolve(profile, { weeklyPlanning: { goals: { [goal]: { headline: '  ' } } } });
      assert.equal(emptyRemote.headline, copy.headline);
    }
    assert.equal(headlines.size, goals.length);
    assert.equal(resolve(null, { weeklyPlanning: { headline: 'Generic campaign' } }).headline, 'Generic campaign');
  }
  console.log('Paywall copy: 4 goals × 6 locales, both entry features, missing answers and remote overrides passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
