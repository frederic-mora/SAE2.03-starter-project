# Architecture serveur PHP — Séparation en 3 couches

## Vue d'ensemble

Le serveur est organisé selon une architecture **3 tiers** (ou 3 couches), un patron de conception classique qui consiste à séparer clairement les responsabilités entre trois niveaux distincts :

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (navigateur)                   │
│          GET /script.php?todo=read&semaine=12&jour=lundi     │
└──────────────────────────┬──────────────────────────────────┘
                           │ Requête HTTP
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  COUCHE 1 — ROUTAGE          script.php                      │
│  "Qui doit traiter cette requête ?"                          │
└──────────────────────────┬──────────────────────────────────┘
                           │ Appel de fonction
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  COUCHE 2 — CONTRÔLE         controller.php                  │
│  "Peut-on et comment traiter cette requête ?"                │
└──────────────────────────┬──────────────────────────────────┘
                           │ Appel de fonction
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  COUCHE 3 — MODÈLE           model.php                       │
│  "Exécute l'opération sur les données"                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Requête SQL
                           ▼
                    [ Base de données ]
```

La réponse remonte ensuite dans l'ordre inverse jusqu'au client, encodée en JSON.

---

## Couche 1 — Le routeur : `script.php`

### Rôle

`script.php` est le **point d'entrée unique** du serveur. Toutes les requêtes HTTP lui sont adressées. Son seul travail est de lire le paramètre `todo` et de déléguer le traitement à la bonne fonction de contrôleur.

Il ne traite aucune donnée métier lui-même. Il gère uniquement :
- la **validité formelle** de la requête (le paramètre `todo` est-il présent ? sa valeur est-elle connue ?)
- le **routage** vers le bon contrôleur
- la **mise en forme finale** de la réponse HTTP (code de statut + encodage JSON)

### Flux de décision

```
Requête reçue
      │
      ▼
  todo défini ?
   ├── NON ──► HTTP 404 (Not Found)
   └── OUI
         │
         ▼
    switch(todo)
     ├── 'read'   ──► readController()
     ├── 'update' ──► updateController()
     └── inconnu  ──► HTTP 400 (Bad Request)
            │
            ▼
     $data === false ?
      ├── OUI ──► HTTP 500 (Internal Error)
      └── NON ──► json_encode($data) + HTTP 200 (OK)
```

### Exemple extrait du code

```php
switch($todo){
    case 'update':
        $data = updateController();
        break;
    case 'read':
        $data = readController();
        break;
    default:
        echo json_encode('[error] Unknown todo value');
        http_response_code(400);
        exit();
}
```

> Le contrat : si le contrôleur retourne `false`, c'est une erreur → HTTP 500. Sinon, on renvoie les données en JSON → HTTP 200.

---

## Couche 2 — Le contrôleur : `controller.php`

### Rôle

`controller.php` regroupe les **fonctions de traitement métier**. Pour chaque valeur possible de `todo`, il existe une fonction dédiée. Le contrôleur est responsable de deux choses :

1. **Vérifier** que la requête est recevable (paramètres présents, non vides, valeurs valides)
2. **Orchestrer** l'appel aux fonctions du modèle et retourner le résultat

Il ne connaît pas la base de données — il sait seulement quelles fonctions du modèle appeler.

### Exemple : `readController()`

```
Paramètre 'semaine' présent et non vide ?  ──► NON → return false
Paramètre 'jour' présent et non vide ?     ──► NON → return false
1 ≤ semaine ≤ 52 ?                         ──► NON → return false
jour ∈ ['lundi'...'dimanche'] ?            ──► NON → return false
                │
                ▼
         getMenu($semaine, $jour)           ◄── appel modèle
                │
                ▼
         return $menu
```

Ce niveau de validation protège à la fois la base de données (on n'exécute pas une requête inutile) et l'intégrité des données (on n'insère pas des valeurs incorrectes).

### Exemple : `updateController()`

Dans cet exemple pédagogique, `updateController()` ne valide pas les paramètres (le commentaire du code le signale explicitement). Dans une application réelle, on y ajouterait les mêmes vérifications que dans `readController()`.

### Principe clé

Chaque contrôleur respecte un **contrat simple** avec `script.php` :
- retourner `false` → quelque chose s'est mal passé
- retourner autre chose → succès, c'est la donnée à renvoyer au client

---

## Couche 3 — Le modèle : `model.php`

### Rôle

`model.php` contient les **fonctions d'accès aux données**. Chaque fonction :
1. ouvre une connexion à la base de données
2. prépare et exécute une requête SQL
3. retourne les résultats bruts

Le modèle ne sait pas d'où vient la requête, ni ce qu'on fera de ses résultats. Il ne connaît que la base de données.

### Sécurité : les requêtes préparées

Toutes les interactions SQL utilisent des **requêtes préparées** avec `bindParam`. Cela immunise le code contre les injections SQL, une des vulnérabilités les plus courantes (OWASP Top 10).

```php
// ✅ Correct : paramètre lié, jamais interpolé dans la chaîne SQL
$sql = "SELECT entree, plat, dessert FROM Repas WHERE jour=:jour AND semaine=:semaine";
$stmt = $cnx->prepare($sql);
$stmt->bindParam(':jour', $j);
$stmt->bindParam(':semaine', $w);
$stmt->execute();
```

```php
// ❌ Dangereux : injection SQL possible
$sql = "SELECT * FROM Repas WHERE jour='$j'";
```

### Fonctions disponibles

| Fonction | Opération SQL | Retour |
|---|---|---|
| `getMenu($w, $j)` | `SELECT` sur `Repas` | tableau d'objets |
| `updateMenu($w, $j, $e, $p, $d)` | `REPLACE INTO` sur `Repas` | nombre de lignes affectées |

---

## Exemple complet : lecture du menu

Requête HTTP envoyée par le client :
```
GET /script.php?todo=read&semaine=12&jour=lundi
```

**Étape 1 — `script.php`**
- `todo` est défini → on entre dans le `switch`
- `todo === 'read'` → appel de `readController()`

**Étape 2 — `controller.php` / `readController()`**
- `semaine=12` → présent, non vide, entre 1 et 52 ✓
- `jour=lundi` → présent, non vide, dans `$days` ✓
- Appel de `getMenu(12, 'lundi')`

**Étape 3 — `model.php` / `getMenu()`**
- Connexion PDO
- Exécution de `SELECT entree, plat, dessert FROM Repas WHERE jour='lundi' AND semaine=12`
- Retour du tableau de résultats

**Réponse remontante**
```
model   → [ {entree: "Salade", plat: "Poulet", dessert: "Yaourt"} ]
controller → le même tableau
script  → HTTP 200 + Content-Type: application/json
          [{"entree":"Salade","plat":"Poulet","dessert":"Yaourt"}]
```

---

## Pourquoi cette organisation ?

### Séparation des responsabilités

Chaque fichier a **une seule raison de changer** :

| Si... | On modifie seulement... |
|---|---|
| On ajoute une nouvelle action (`todo=delete`) | `script.php` (+ nouvelle fonction dans `controller.php`) |
| On change les règles de validation d'un paramètre | `controller.php` |
| On migre vers un autre SGBD (PostgreSQL, SQLite...) | `model.php` |
| On change le format de réponse (XML au lieu de JSON) | `script.php` |

Sans cette séparation, tout serait mélangé dans un seul fichier : changer la base de données signifierait toucher au code de routage, et inversement.

### Lisibilité et maintenabilité

Un développeur qui rejoint le projet sait immédiatement où chercher :
- Un bug dans une requête SQL → `model.php`
- Un problème de validation de paramètre → `controller.php`
- Un mauvais code de réponse HTTP → `script.php`

### Scalabilité

Ajouter une nouvelle fonctionnalité ne perturbe pas l'existant :
- Nouvelle action → nouvelle entrée dans le `switch` + nouvelle fonction dans `controller.php` + éventuellement une nouvelle fonction dans `model.php`
- Les autres actions ne sont pas touchées

### Testabilité

Chaque couche peut être **testée indépendamment** :
- Les fonctions du modèle peuvent être testées avec des appels directs en PHP
- Les contrôleurs peuvent être testés en simulant des variables `$_REQUEST`
- Le routeur peut être testé avec des clients HTTP (curl, Postman...)

---

## Représentation synthétique

```
script.php          controller.php          model.php           Base de données
    │                     │                     │                      │
    │  todo=read          │                     │                      │
    │────────────────────►│                     │                      │
    │                     │  valide params      │                      │
    │                     │─────────────────────►                      │
    │                     │                     │  SELECT ...          │
    │                     │                     │─────────────────────►│
    │                     │                     │  résultats           │
    │                     │                     │◄─────────────────────│
    │                     │  return $menu        │                      │
    │                     │◄────────────────────│                      │
    │  json_encode($data) │                     │                      │
    │◄────────────────────│                     │                      │
    │                     │                     │                      │
  HTTP 200 + JSON
```
