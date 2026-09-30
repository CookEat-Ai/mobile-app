/** Resolve missing/catalog placeholder icons at display time, including cached recipes. */
import catalogAliases from './CatalogIngredientIconAliases.json';
const normalize = (value: string) => value
  .toLowerCase()
  .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

// Specific preparations precede their ingredients (e.g. coconut milk, potato).
// Aliases cover French, English, Spanish, Portuguese and German.
const INGREDIENT_ICONS: [string, string][] = [
  ['🥥', 'lait de coco|creme de coco|coconut milk|coconut cream|leche de coco|leite de coco|kokosmilch'],
  ['🥜', 'beurre de cacahuete|beurre de cacahuetes|peanut butter|mantequilla de mani|crema de cacahuete|pasta de amendoim|erdnussbutter'],
  ['🫒', 'huile|huiles|oil|oils|aceite|azeite|oleo|olivenol|rapsol|sonnenblumenol|pflanzenol'],
  ['🍲', 'bouillon|broth|stock|caldo|bruehe|bruhe'],
  ['🍠', 'patate douce|patates douces|sweet potato|sweet potatoes|batata doce|batatas doces|boniato|camote|susskartoffel|susskartoffeln'],
  ['🥔', 'pomme de terre|pommes de terre|potato|potatoes|patata|patatas|papa|papas|batata|batatas|kartoffel|kartoffeln'],
  ['🫑', 'poivron|poivrons|bell pepper|bell peppers|sweet pepper|pimiento|pimientos|pimentao|pimentoes|paprikaschote|paprikaschoten'],
  ['🧂', 'poivre|pepper|pimienta|pimenta do reino|pfeffer'],
  ['🌶️', 'piment|piments|chili|chilli|cayenne|jalapeno|jalapenos|paprika|pimenta'],
  ['🥣', 'farine|flour|harina|farinha|mehl|amidon|starch|fecule|maizena'],
  ['🥣', 'flocons|avoine|oat|oats|avena|aveia|hafer|haferflocken|muesli|granola'],
  ['🫘', 'haricot rouge|haricots rouges|haricot blanc|haricots blancs|haricot noir|haricots noirs|kidney bean|kidney beans|white bean|white beans|black bean|black beans|pois chiche|pois chiches|chickpea|chickpeas|garbanzo|garbanzos|grao de bico|kichererbse|kichererbsen|lentille|lentilles|lentil|lentils|lenteja|lentejas|lentilha|lentilhas|linse|linsen|frijol|frijoles|feijao|feijoes'],
  ['🫛', 'haricot vert|haricots verts|green bean|green beans|grune bohnen|judias verdes|vagem|vagens|petit pois|petits pois|pea|peas|guisante|guisantes|ervilha|ervilhas|erbse|erbsen|edamame'],
  ['🧀', 'cream cheese|fromage a la creme|queso crema|queijo cremoso|frischkase'],
  ['🥛', 'lait|milk|leche|leite|milch|creme|cream|nata|sahne'],
  ['🧈', 'beurre|butter|mantequilla|manteiga|margarine|margarina|ghee'],
  ['🧀', 'fromage|cheese|queso|queijo|kase|feta|ricotta|parmesan|parmigiano|mozzarella|cheddar|cottage|chevre|halloumi|mascarpone'],
  ['🥣', 'yaourt|yaourts|yogurt|yoghurt|yogur|iogurte|joghurt|skyr|quark'],
  ['🥚', 'oeuf|oeufs|egg|eggs|huevo|huevos|ovo|ovos|ei|eier'],
  ['🍗', 'poulet|poultry|chicken|dinde|turkey|pollo|pavo|frango|peru|hahnchen|hahnchenbrust|hahnchenbrustfilet|huhn|huhnerbrust|pute|putenbrust|canard|duck|pato|ente'],
  ['🥩', 'boeuf|beef|veau|veal|agneau|lamb|viande|meat|carne|ternera|cordero|rind|rindfleisch|rinderhackfleisch|rinderhack|kalb|lamm|fleisch'],
  ['🥓', 'bacon|lardon|lardons|jambon|ham|jamon|presunto|speck|schinken'],
  ['🥩', 'porc|pork|porco|cerdo|schwein|schweinefleisch'],
  ['🐟', 'saumon|salmon|salmao|lachs|lachsfilet|thon|tuna|atun|atum|thunfisch|sardine|sardines|sardinha|sardinhas|cabillaud|morue|cod|bacalhau|bacalao|kabeljau|poisson|fish|pescado|peixe|fisch|truite|trout|forelle|maquereau|mackerel|anchois|anchovy|anchovies'],
  ['🦐', 'crevette|crevettes|shrimp|shrimps|prawn|prawns|gamba|gambas|camaron|camarones|camarao|camaroes|garnele|garnelen'],
  ['🦀', 'crabe|crab|cangrejo|caranguejo|krabbe'],
  ['🦑', 'calamar|calamars|squid|lula|tintenfisch'],
  ['🦪', 'moule|moules|mussel|mussels|huitre|huitres|oyster|oysters|mejillon|mejillones|mexilhao|mexilhoes|muschel|muscheln|palourde|palourdes|clam|clams'],
  ['🫘', 'tofu|tempeh|soja|soy|soya|seitan|bean|beans|bohne|bohnen'],
  ['🍚', 'riz|rice|arroz|reis'],
  ['🍝', 'pate|pates|pasta|spaghetti|penne|macaroni|nouille|nouilles|noodle|noodles|nudel|nudeln|fideo|fideos|massa|macarrao|soba|udon'],
  ['🍞', 'pain|bread|pan|pao|brot|toast|tartine|tartines|chapelure|breadcrumbs'],
  ['🫓', 'tortilla|tortillas|pita|naan|wrap|wraps'],
  ['🌾', 'quinoa|boulgour|bulgur|couscous|semoule|semolina|semola|polenta|ble|wheat|trigo|weizen|orge|barley|cevada|gerste'],
  ['🥕', 'carotte|carottes|carrot|carrots|zanahoria|zanahorias|cenoura|cenouras|karotte|karotten|mohre|mohren'],
  ['🍅', 'tomate|tomates|tomato|tomatoes|tomaten'],
  ['🥒', 'concombre|concombres|cucumber|cucumbers|pepino|pepinos|gurke|gurken|courgette|courgettes|zucchini|calabacin|abobrinha'],
  ['🥦', 'brocoli|brocolis|broccoli|brokkoli'],
  ['🥬', 'epinard|epinards|spinach|espinaca|espinacas|espinafre|spinat|salade|laitue|lettuce|lechuga|alface|salat|chou|choux|cabbage|cauliflower|kale|repolho|couve|kohl|blumenkohl|roquette|arugula|rucola|poireau|poireaux|leek|leeks|lauch|fenouil|fennel|fenchel|celeri|celery|sellerie|endive|endives|asperge|asperges|asparagus|spargel'],
  ['🍆', 'aubergine|aubergines|eggplant|eggplants|berenjena|berenjenas|berinjela'],
  ['🌽', 'mais|corn|elote|maiz|milho'],
  ['🍄', 'champignon|champignons|mushroom|mushrooms|seta|setas|cogumelo|cogumelos|pilz|pilze|shiitake'],
  ['🧅', 'oignon|oignons|onion|onions|echalote|echalotes|shallot|shallots|cebolla|cebollas|cebola|cebolas|zwiebel|zwiebeln|schalotte|schalotten'],
  ['🧄', 'ail|garlic|ajo|ajos|alho|knoblauch'],
  ['🫚', 'gingembre|ginger|jengibre|gengibre|ingwer'],
  ['🎃', 'courge|courges|potiron|potimarron|butternut|pumpkin|squash|calabaza|abobora|kurbis'],
  ['🥑', 'avocat|avocats|avocado|avocados|aguacate|aguacates|abacate'],
  ['🫒', 'olive|olives|oliven|aceituna|aceitunas|azeitona|azeitonas'],
  ['🍋', 'citron|citrons|lemon|lemons|lime|limes|limon|limones|limao|limoes|zitrone|zitronen|limette|limetten'],
  ['🍎', 'pomme|pommes|apple|apples|manzana|manzanas|maca|macas|apfel|apfelmus'],
  ['🍌', 'banane|bananes|banana|bananas|platano|platanos|bananen'],
  ['🍓', 'fraise|fraises|strawberry|strawberries|fresa|fresas|morango|morangos|erdbeere|erdbeeren'],
  ['🫐', 'myrtille|myrtilles|blueberry|blueberries|framboise|framboises|raspberry|raspberries|berries|fruits rouges|arandano|arandanos|mirtilo|mirtilos|heidelbeere|heidelbeeren|himbeere|himbeeren'],
  ['🍊', 'orange|oranges|mandarine|clementine|naranja|naranjas|laranja|laranjas|orangen'],
  ['🍐', 'poire|poires|pear|pears|pera|peras|birne|birnen'],
  ['🍑', 'peche|peches|peach|peaches|abricot|abricots|apricot|apricots|melocoton|durazno|pessego|pfirsich'],
  ['🥭', 'mangue|mangues|mango|mangos|manga|mangas|papaye|papaya|mamao'],
  ['🍍', 'ananas|pineapple|pina|abacaxi'],
  ['🥝', 'kiwi|kiwis'],
  ['🍇', 'raisin|raisins|grape|grapes|uva|uvas|trauben|rosinen'],
  ['🥥', 'coco|coconut|kokos|kokosnuss'],
  ['🥜', 'cacahuete|cacahuetes|peanut|peanuts|mani|amendoim|erdnuss|erdnusse|amande|amandes|almond|almonds|almendra|almendras|amendoa|amendoas|mandel|mandeln|noix|nut|nuts|walnut|walnuts|cashew|cashews|cajou|caju|noisette|noisettes|hazelnut|hazelnuts|pistache|pistachio'],
  ['🍯', 'miel|honey|mel|honig|sirop|syrup|jarabe|xarope|sirup'],
  ['🍫', 'chocolat|chocolate|schokolade|cacao|cocoa|kakao'],
  ['🧂', 'sel|salt|sal|salz|sucre|sugar|azucar|acucar|zucker'],
  ['🌿', 'persil|parsley|perejil|salsinha|petersilie|coriandre|coriander|cilantro|coentro|koriander|basilic|basil|albahaca|manjericao|basilikum|menthe|mint|menta|hortela|minze|thym|thyme|tomillo|tomilho|thymian|romarin|rosemary|rosemarin|origan|oregano|aneth|dill|ciboulette|chives|herbe|herbes|herb|herbs|nori|algue|algues|seaweed'],
  ['🧂', 'cumin|curcuma|turmeric|curry|cannelle|cinnamon|canela|zimt|sumac|muscade|nutmeg|epice|epices|spice|spices|gewurz|gewurze'],
  ['🥣', 'tahini|tahin|sesame|sesam|gergelim|chia|graine|graines|seed|seeds|moutarde|mustard|mostaza|mostarda|senf|vinaigre|vinegar|vinagre|essig|sauce|salsa|molho|sosse'],
];

const rules = INGREDIENT_ICONS.map(([icon, aliases]) => ({
  icon,
  aliases: aliases.split('|').map((alias) => ` ${normalize(alias)} `),
}));
const PLACEHOLDERS = new Set(['', '🍽', '🍴', '🛒', '🥄']);

export function getIngredientIcon(name: string, suppliedIcon?: string | null): string {
  const icon = typeof suppliedIcon === 'string' ? suppliedIcon.trim() : '';
  if (!PLACEHOLDERS.has(icon.replace(/\uFE0F/g, ''))) return icon;
  // Preparation notes can mention another food; identify the ingredient itself.
  const normalized = normalize(String(name || '').split(/[,;(]/)[0]);
  const catalogIcon = (catalogAliases as Record<string, string>)[normalized];
  if (catalogIcon) return catalogIcon;
  const ingredient = ` ${normalized} `;
  return rules.find((rule) => rule.aliases.some((alias) => ingredient.includes(alias)))?.icon || '🥣';
}
