import json
from pathlib import Path
# Existing approved descriptions retain their legal, support and subscription wording.
old=json.loads(Path(__file__).with_name('base-descriptions.json').read_text())
rows={
'en':[
'CookEat: Calorie Counter','Photo Food Diary & Meal Plans',
'nutrition,protein,carbs,fats,food,diary,meals,planner,recipes,fitness,journal',
'Snap your meals, track calories and macros, and plan your weekly menu.',
'Snap your meal, review estimated calories and macros, and keep your food diary up to date. You can also add food without a photo.',
'SNAP YOUR MEAL. TRACK YOUR DAY.\nPhotograph a meal to estimate its calories, protein, carbs and fats. Review the detected foods and portions, correct any value, and find the meal in your daily food diary. Forgot a photo? Add foods manually, create foods missing from the list, or enter meal totals. Your food corrections become defaults for the next time you use that ingredient.',
'New: meal tracking by photo. Review estimated calories and macros, edit each food, and add meals without a photo. Photo meals are added to your day automatically. Food corrections are remembered for next time. Meal reminders follow your local time, and you can create a new plan after its final scheduled day.'],
'fr-FR':[
'CookEat : Compteur de calories','Photo, macros et menus adaptés',
'nutrition,protéines,glucides,lipides,journal,alimentaire,planning,recettes,fitness',
'Analyse tes repas en photo, suis tes macros et planifie tes menus.',
'Photographie ton repas, vérifie ses calories et ses macros estimées, puis retrouve-le dans ton journal. Tu peux aussi ajouter un repas sans photo.',
'PHOTOGRAPHIE TON REPAS, SUIS TA JOURNÉE\nPrends ton repas en photo pour estimer ses calories, protéines, glucides et lipides. Vérifie les aliments et les portions, corrige les valeurs si besoin et retrouve le repas dans ton journal alimentaire. Photo oubliée ? Ajoute tes aliments à la main, crée ceux qui manquent dans la liste ou saisis les totaux du repas. Tes corrections deviennent les valeurs par défaut pour la prochaine utilisation de cet aliment.',
'Nouveau : le suivi des repas par photo. Vérifie les calories et macros estimées, modifie chaque aliment ou ajoute un repas sans photo. Les repas photographiés rejoignent automatiquement ta journée. Tes corrections sont mémorisées pour les prochains repas. Les rappels suivent ton heure locale et un nouveau planning est disponible après le dernier jour prévu.'],
'de-DE':[
'CookEat: Kalorienzähler','Foto-Tagebuch & Wochenplan',
'ernährung,protein,kohlenhydrate,fett,tagebuch,lebensmittel,rezepte,fitness,wochenplan',
'Fotografiere dein Essen, tracke Kalorien und Makros und plane deine Mahlzeiten.',
'Fotografiere deine Mahlzeit und prüfe die geschätzten Kalorien und Makros. Ergänze dein Ernährungstagebuch auch ohne Foto.',
'MAHLZEIT FOTOGRAFIEREN, TAG IM BLICK\nSchätze Kalorien, Protein, Kohlenhydrate und Fett anhand eines Fotos deiner Mahlzeit. Prüfe Lebensmittel und Portionen, passe die Werte an und finde die Mahlzeit in deinem Ernährungstagebuch. Foto vergessen? Füge Lebensmittel manuell hinzu, erstelle fehlende Einträge oder gib die Gesamtwerte ein. Deine Korrekturen werden beim nächsten Verwenden dieses Lebensmittels als Standard übernommen.',
'Neu: Mahlzeiten per Foto erfassen. Geschätzte Kalorien und Makros prüfen, Lebensmittel bearbeiten oder Mahlzeiten ohne Foto hinzufügen. Fotomahlzeiten werden automatisch eingetragen. Lebensmittelkorrekturen bleiben gespeichert. Erinnerungen richten sich nach deiner Ortszeit; nach dem letzten geplanten Tag kannst du einen neuen Plan erstellen.'],
'es-ES':[
'CookEat: Contador de calorías','Fotos, macros y menú semanal',
'nutrición,proteínas,carbohidratos,grasas,diario,alimentos,recetas,fitness,planificador',
'Registra tus comidas con una foto, controla tus macros y planifica tus menús.',
'Fotografía tu comida y revisa sus calorías y macros estimadas. Lleva tu diario de comidas también sin foto.',
'FOTOGRAFÍA TU COMIDA Y REGISTRA TU DÍA\nEstima las calorías, proteínas, carbohidratos y grasas con una foto de tu comida. Revisa los alimentos y las porciones, corrige los valores y encuentra la comida en tu diario. ¿Olvidaste la foto? Añade alimentos a mano, crea los que faltan o introduce los totales. Tus correcciones se guardan como valores predeterminados para la próxima vez que uses ese alimento.',
'Nuevo: registro de comidas por foto. Revisa calorías y macros estimadas, edita cada alimento o añade comidas sin foto. Las comidas fotografiadas se guardan automáticamente. Tus correcciones se recuerdan. Los recordatorios siguen tu hora local y puedes crear un nuevo menú después del último día planificado.'],
'es-MX':[
'CookEat: Contador de calorías','Fotos, macros y menú semanal',
'nutrición,proteínas,carbohidratos,grasas,diario,alimentos,recetas,fitness,planificador',
'Registra tus comidas con fotos, lleva el control de tus macros y planea menús.',
'Toma una foto de tu comida y revisa sus calorías y macros estimadas. Lleva tu diario de comidas también sin foto.',
'TOMA UNA FOTO DE TU COMIDA Y REGISTRA TU DÍA\nEstima calorías, proteínas, carbohidratos y grasas con una foto de tu comida. Revisa los alimentos y las porciones, corrige los valores y encuentra la comida en tu diario. ¿Olvidaste la foto? Agrega alimentos a mano, crea los que faltan o ingresa los totales. Tus correcciones se guardan como valores predeterminados para la próxima vez que uses ese alimento.',
'Nuevo: registro de comidas por foto. Revisa calorías y macros estimadas, edita cada alimento o agrega comidas sin foto. Las comidas fotografiadas se guardan automáticamente. Tus correcciones se recuerdan. Los recordatorios siguen tu hora local y puedes crear un nuevo menú después del último día planeado.'],
'pt-BR':[
'CookEat: Contador de calorias','Fotos, macros e cardápio',
'nutrição,proteínas,carboidratos,gorduras,diário,alimentar,receitas,fitness,planejamento',
'Registre suas refeições com fotos, acompanhe seus macros e planeje seu cardápio.',
'Fotografe sua refeição e confira as calorias e os macros estimados. Mantenha seu diário alimentar também sem foto.',
'FOTOGRAFE SUA REFEIÇÃO E ACOMPANHE SEU DIA\nEstime calorias, proteínas, carboidratos e gorduras com uma foto da refeição. Confira os alimentos e as porções, corrija os valores e encontre a refeição no seu diário alimentar. Esqueceu a foto? Adicione alimentos manualmente, crie os que faltam ou informe os totais. Suas correções ficam salvas como padrão para a próxima vez que usar esse alimento.',
'Novidade: registro de refeições por foto. Confira calorias e macros estimados, edite cada alimento ou adicione refeições sem foto. As refeições fotografadas são salvas automaticamente. Suas correções ficam guardadas. Os lembretes seguem seu horário local e um novo cardápio fica disponível após o último dia planejado.']}
result={}
for locale,approved in old.items():
 name,subtitle,keywords,short,promo,prefix,new=rows['en' if locale.startswith('en-') else locale]
 row=dict(name=name,subtitle=subtitle,keywords=keywords,short=short,promo=promo,description=prefix+'\n\n'+approved['description'],new=new)
 if locale in ('en-GB','en-AU'): row['short'] = 'Photograph your meals, track calories and macros, and plan your weekly menu.'
 for key,limit in [('name',30),('subtitle',30),('keywords',100),('short',80),('promo',170),('description',4000),('new',4000)]:assert len(row[key])<=limit,(locale,key,len(row[key]))
 result[locale]=row
Path('metadata/1.8.0/store-copy.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('All metadata field limits validated for',len(result),'locales.')
