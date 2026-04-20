# Architecture front-end — Pattern MVC en JavaScript natif

## Vue d'ensemble

Les deux applications front-end (`backoffice` et `client`) partagent exactement la même organisation. Chacune applique le patron de conception **MVC (Modèle — Vue — Contrôleur)** en répartissant le code en trois zones aux responsabilités bien définies.

```
application/
│
├── index.html          ◄── CONTRÔLEUR  (logique, événements, coordination)
│
├── data/
│   └── dataMenu.js     ◄── MODÈLE     (dialogue avec l'API serveur)
│
├── component/
│   ├── Menu/           ◄── VUE        (affichage, un composant par entité)
│   │   ├── script.js
│   │   ├── template.html
│   │   └── style.css
│   └── NewMenuForm/
│       ├── script.js
│       ├── template.html
│       └── style.css
│
├── css/                (styles globaux)
└── assets/             (images, polices...)
```

Chaque couche ne connaît que la suivante — jamais les détails internes des autres. C'est ce cloisonnement qui donne à cette architecture toute sa valeur.

---

## Le Modèle — `data/`

### Rôle

Le dossier `data/` concentre **tout le dialogue avec l'API serveur**. C'est le seul endroit de l'application où l'on trouvera des `fetch`. Ni les composants, ni `index.html` n'ont connaissance de l'URL du serveur ou du protocole d'échange.

Un fichier = une entité. Aujourd'hui il n'y a que `dataMenu.js`. Si demain on devait gérer des utilisateurs, on créerait `dataUser.js` sans toucher à l'existant.

### Anatomie d'un module de données

```
data/dataMenu.js
│
├── HOST_URL            ← URL de base du serveur (seul endroit à modifier si le serveur change)
├── DataMenu.request()  ← lecture d'un menu (requête GET)
├── DataMenu.update()   ← écriture d'un menu (requête POST)
└── export {DataMenu}   ← seul DataMenu est exposé
```

### Exemple : `DataMenu.request()` (application client)

```js
DataMenu.request = async function(week, day){
    let answer = await fetch(HOST_URL + "/server/script.php?todo=read&semaine=" + week + "&jour=" + day);
    let data = await answer.json();  // JSON → objet JavaScript automatiquement
    return data;
}
```

La fonction reçoit des paramètres simples (`week`, `day`), construit l'URL nécessaire, attend la réponse, la convertit en objets JS et retourne le résultat. L'appelant n'a aucun besoin de savoir comment le serveur fonctionne.

### Exemple : `DataMenu.update()` (application backoffice)

```js
DataMenu.update = async function (fdata) {
    let config = {
        method: "POST",
        body: fdata   // FormData directement dans le corps de la requête
    };
    let answer = await fetch(HOST_URL + "/server/script.php?todo=update", config);
    let data = await answer.json();
    return data;
}
```

L'objet `FormData` (construit automatiquement à partir d'un `<form>`) est placé tel quel dans le corps de la requête POST — le nom des champs du formulaire devient les paramètres reçus côté serveur.

### `async` / `await` : pourquoi ?

Un `fetch` prend un temps impossible à prédire (le serveur peut être lent, voire hors ligne). Sans `await`, on essayerait de lire les données avant de les avoir reçues. Le mot-clé `await` suspend l'exécution **uniquement à l'intérieur de la fonction** et rend la main au navigateur le temps d'attendre la réponse — sans bloquer le reste de la page.

```
async function   →  autorise l'utilisation de await à l'intérieur
await fetch(…)   →  attend la réponse réseau avant de continuer
await .json()    →  attend la désérialisation JSON avant de continuer
```

---

## La Vue — `component/`

### Rôle

Le dossier `component/` regroupe les **briques d'interface**. Chaque composant sait uniquement **afficher des données** qu'on lui transmet — il n'appelle jamais le serveur, ne prend aucune décision applicative.

Un composant = un dossier dédié, avec trois fichiers :

```
component/NomComposant/
├── template.html   ← structure HTML avec des marqueurs {{placeholder}}
├── style.css       ← styles propres à ce composant
└── script.js       ← logique de rendu (remplacement des placeholders)
```

### Le mécanisme de rendu par template

Le fichier `template.html` est un fragment HTML avec des **marqueurs** (`{{entree}}`, `{{plat}}`, etc.). Le `script.js` du composant le charge une seule fois au démarrage, puis expose une fonction `format()` qui remplace les marqueurs par les données réelles.

```
template.html                          script.js
┌────────────────────────┐            ┌──────────────────────────────────────┐
│ <div class="menu">     │ ─── fetch ►│ let template = await fetch(...)      │
│   <span>{{entree}}</span│            │ // plus tard...                      │
│   <span>{{plat}}</span> │            │ Menu.format = function(menu){        │
│   <span>{{dessert}}</span│           │   html = template                    │
│ </div>                 │            │   html = html.replace('{{entree}}',  │
└────────────────────────┘            │             menu.entree)             │
                                      │   return html  ← du HTML prêt        │
                                      │ }                                     │
                                      └──────────────────────────────────────┘
```

### Exemple : composant `Menu` (client)

```js
Menu.format = function(menu){
    let html = template;
    html = html.replace('{{entree}}', menu.entree);
    html = html.replace('{{plat}}', menu.plat);
    html = html.replace('{{dessert}}', menu.dessert);
    return html;  // chaîne HTML, prête à injecter dans le DOM
}

Menu.formatMany = function(menus){
    let html = '';
    for (const menu of menus) {
        html += Menu.format(menu);
    }
    return html;
}
```

Le composant expose deux fonctions : une pour formater un menu, une pour en formater plusieurs. Rien d'autre n'est exporté.

### Encapsulation : exemple avec le composant `Log` (backoffice)

```js
let history = [];       // interne, non exporté

let add = function(txt){ ... }              // interne, non exporté
let formatHistory = function(){ ... }      // interne, non exporté

Log.format = function(txt){                // seule fonction publique
    add(txt);
    let html = template;
    html = html.replace("{{logs}}", formatHistory());
    return html;
}

export {Log};   // seul Log est visible de l'extérieur
```

L'historique des logs et les fonctions internes sont **encapsulés** dans le module : personne en dehors du composant ne peut y accéder directement. C'est un exemple simple mais concret d'encapsulation.

### Passage de gestionnaire d'événement par injection

Le composant `NewMenuForm` illustre une technique utile : le `handler` (la fonction à appeler au clic) lui est passé sous forme de **chaîne de caractères** :

```js
// Dans index.html (contrôleur)
NewMenuForm.format("C.handlerUpdate()");

// Dans template.html
<input onclick="{{handler}}" type="button" value="Update">

// Résultat dans le DOM
<input onclick="C.handlerUpdate()" type="button" value="Update">
```

Le composant n'a jamais connaissance de l'existence de `C.handlerUpdate`. Il injecte la chaîne et le navigateur s'occupe de l'appeler au bon moment. Le composant reste ainsi totalement découplé du contrôleur.

---

## Le Contrôleur — `index.html`

### Rôle

`index.html` est **l'application elle-même**. C'est là que le Modèle et la Vue sont importés et connectés. Le `<script type="module">` qu'il contient est le seul endroit où l'on trouve :
- la logique applicative
- la gestion des événements
- la coordination entre données et affichage

### Structure type

```html
<script type="module">
    import {DataMenu}    from './data/dataMenu.js';    // ← Modèle
    import {Menu}        from './component/Menu/script.js';  // ← Vue

    window.C = {};   // Contrôleur (global pour faciliter le débogage en console)
    window.V = {};   // Vue-wrapper (idem)

    /* Gestionnaires d'événements (Contrôleur) */
    C.getMenu = async function(jour){
        let semaine = document.querySelector('#semaine').value;
        let data = await DataMenu.request(semaine, jour);  // appel Modèle
        V.renderMenu(data);                                // délègue à la Vue
    }

    /* Fonctions d'affichage (Vue-wrapper) */
    V.renderMenu = function(data){
        let content = document.querySelector('.content');
        content.innerHTML = Menu.formatMany(data);         // appel composant
    }
</script>
```

### Le flux d'un événement

```
[Utilisateur clique "Lundi"]
         │
         ▼
C.getMenu('lundi')                          ← Contrôleur reçoit l'événement
         │
         ▼
DataMenu.request(semaine, 'lundi')          ← appel Modèle
         │  (fetch + await)
         ▼
[ API serveur répond avec du JSON ]
         │
         ▼
data = [{entree:..., plat:..., dessert:...}]
         │
         ▼
V.renderMenu(data)                          ← Contrôleur délègue à la Vue
         │
         ▼
Menu.formatMany(data)                       ← composant formate en HTML
         │
         ▼
content.innerHTML = html                    ← DOM mis à jour
         │
         ▼
[Page affiche le menu]
```

### `window.C` et `window.V` plutôt que `let C`

À l'intérieur d'un `<script type="module">`, les variables déclarées avec `let` sont locales au module et inaccessibles depuis la console du navigateur. En les attachant à `window`, elles deviennent testables directement : `C.getMenu('lundi')` dans la console fonctionne sans recharger la page. En production, on pourrait revenir à `let`.

---

## Exemple complet : affichage du menu du lundi (application client)

```
Utilisateur
    │  clique <button onclick="C.getMenu('lundi')">
    ▼
index.html — C.getMenu('lundi')
    │  lit #semaine → 12
    │  appelle DataMenu.request(12, 'lundi')
    ▼
data/dataMenu.js — DataMenu.request(12, 'lundi')
    │  fetch(".../server/script.php?todo=read&semaine=12&jour=lundi")
    │  await réponse serveur
    │  await .json() → [{entree:"Salade", plat:"Poulet", dessert:"Yaourt"}]
    │  return data
    ▼
index.html — C.getMenu reçoit data
    │  appelle V.renderMenu(data)
    ▼
index.html — V.renderMenu(data)
    │  appelle Menu.formatMany(data)
    ▼
component/Menu/script.js — Menu.formatMany(data)
    │  pour chaque menu → Menu.format(menu)
    │  remplace {{entree}}, {{plat}}, {{dessert}} dans le template
    │  retourne HTML
    ▼
index.html — content.innerHTML = html
    ▼
DOM mis à jour — l'utilisateur voit le menu
```

---

## Pourquoi cette organisation ?

### Séparation des responsabilités

Chaque partie du code a **une seule raison de changer** :

| Si l'on veut...                              | On modifie uniquement...         |
|----------------------------------------------|----------------------------------|
| Changer l'URL du serveur                     | `data/dataMenu.js` (`HOST_URL`)  |
| Ajouter un champ dans un formulaire          | `component/NomForm/template.html`|
| Changer le style d'un composant              | `component/NomComposant/style.css`|
| Ajouter une nouvelle action utilisateur      | `index.html` (+ éventuellement `data/`) |
| Gérer une nouvelle entité (ex. utilisateurs) | Nouveau `data/dataUser.js` + nouveaux composants |

Sans cette séparation, modifier une mise en page impliquerait de faire attention à ne pas casser le code d'accès aux données, et inversement.

### Lisibilité

Un développeur qui rejoint le projet sait immédiatement où chercher :
- Problème de requête réseau → `data/`
- Problème d'affichage → `component/`
- Problème de logique applicative → `index.html`

### Scalabilité

Ajouter des fonctionnalités ne perturbe pas l'existant. La règle est simple : **un type d'entité = un module de données + autant de composants que nécessaire**. Les nouvelles fonctionnalités s'ajoutent en parallèle, sans modifier ce qui existe déjà.

### Réutilisabilité

Un composant peut être utilisé dans plusieurs pages ou plusieurs applications. Le composant `Menu` pourrait aussi bien s'insérer dans une page de planning hebdomadaire, une version imprimable ou une autre application — il ne dépend que des données qu'on lui passe.

### Testabilité

Chaque couche peut être testée indépendamment :
- Les modules `data/` : on peut appeler `DataMenu.request(...)` directement depuis la console
- Les composants : on peut appeler `Menu.format({entree:"test", ...})` et inspecter le HTML retourné
- Le contrôleur : grâce à `window.C`, toutes les fonctions sont accessibles depuis la console du navigateur

### Encapsulation

Les variables et fonctions internes aux modules (exemple : `history` et `add()` dans `Log`) ne sont pas accessibles de l'extérieur. Seul ce qui est explicitement `export`é est visible. Cela évite les effets de bord involontaires et force à passer par l'interface publique du composant.

---

## Vue d'ensemble générale : front + serveur

> Pour le détail de la partie serveur, consulter [server/ARCHITECTURE-API-SERVER.md](server/ARCHITECTURE-API-SERVER.md).

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║                              NAVIGATEUR (client)                                ║
║                                                                                  ║
║  ┌─────────────────────────────────────────────────────────────────────────┐    ║
║  │ index.html — CONTRÔLEUR                                                 │    ║
║  │                                                                         │    ║
║  │   window.C = { getMenu(), handlerUpdate(), start(), ... }               │    ║
║  │   window.V = { renderMenu(), renderLog(), ... }                         │    ║
║  │                                                                         │    ║
║  │   ┌──── importe ────┐              ┌──── importe ────┐                  │    ║
║  │   ▼                 ▼              ▼                 ▼                  │    ║
║  │                                                                         │    ║
║  │ ┌────────────────┐          ┌────────────────┐  ┌────────────────┐     │    ║
║  │ │  data/         │          │  component/    │  │  component/    │     │    ║
║  │ │  dataMenu.js   │          │  Menu/         │  │  NewMenuForm/  │     │    ║
║  │ │  MODÈLE        │          │  VUE           │  │  VUE           │     │    ║
║  │ │                │          │                │  │                │     │    ║
║  │ │ DataMenu       │          │ Menu.format()  │  │ NewMenuForm    │     │    ║
║  │ │ .request()     │          │ Menu           │  │ .format()      │     │    ║
║  │ │ .update()      │          │ .formatMany()  │  │                │     │    ║
║  │ └───────┬────────┘          └────────────────┘  └────────────────┘     │    ║
║  │         │ fetch / await                                                 │    ║
║  └─────────┼─────────────────────────────────────────────────────────────-┘    ║
╚════════════╪═════════════════════════════════════════════════════════════════════╝
             │  Requête HTTP (GET ou POST)
             │  ?todo=read&semaine=12&jour=lundi
             ▼
╔═══════════════════════════════════════════════════════════════════════════════════╗
║                              SERVEUR PHP                                         ║
║                                                                                  ║
║  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐           ║
║  │  script.php      │    │  controller.php  │    │  model.php       │           ║
║  │  ROUTEUR         │───►│  CONTRÔLEUR      │───►│  MODÈLE          │           ║
║  │                  │    │                  │    │                  │    SQL     ║
║  │ switch(todo)     │    │ valide params    │    │ getMenu()     ───┼──────────►║
║  │ → readController │    │ → appelle modèle │    │ updateMenu()     │    ◄──────║
║  │ → updateController    │                  │    │ PDO / requêtes   │  Base de  ║
║  │                  │    │                  │    │ préparées        │  données  ║
║  └──────────────────┘    └──────────────────┘    └──────────────────┘           ║
║                                                                                  ║
║  ◄──────────────────────── Réponse JSON ─────────────────────────────────────   ║
╚═══════════════════════════════════════════════════════════════════════════════════╝
```

### Synthèse des responsabilités par couche

| Couche | Fichier(s) | Rôle | Ne fait jamais |
|---|---|---|---|
| **Contrôleur front** | `index.html` | Coordonne M et V, gère les événements | Appeler `fetch`, générer du HTML |
| **Modèle front** | `data/*.js` | Dialogue avec l'API, retourne des objets JS | Manipuler le DOM, afficher |
| **Vue front** | `component/*/` | Formate des données en HTML | Appeler le serveur, décider de la logique |
| **Routeur serveur** | `script.php` | Route la requête selon `todo` | Valider, accéder à la BDD |
| **Contrôleur serveur** | `controller.php` | Valide les paramètres, orchestre le modèle | Accéder directement à la BDD |
| **Modèle serveur** | `model.php` | Exécute les requêtes SQL | Connaître la requête HTTP |
