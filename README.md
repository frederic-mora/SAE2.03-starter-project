## Installation et configuration du projet

Rappel : Le sujet est [ici](https://docs.google.com/document/d/1MxM8H3PVpFOUG4-buM8BLXRv18PIHKrjf76EBzmINZs/edit?usp=sharing)

### 1. Importation de la base de données
Via phpMyAdmin, importez le fichier SAE2_03.sql dans votre BDD sur mmi.unilim.fr
Deux tables sont présentes, Movie et Category. Assurez-vous au préalable qu'il n'y a
pas de conflit de nommage avec vos autres tables.

### 2. Mise à jour des identifiants de connexion à la base de donnnées
Editez ensuite le fichier server/model.php pour changer les identifiants de connexion à la BDD

### 3. Vérification
Vérifiez que vous accédez bien à l'index.html de l'application utilisateur (app) et de l'application administrateur (admin). L'une et l'autre sont quasi vides et ne disposent encore d'aucune fonctionnalité.
Mais chacune possède un composant que vous devez voir apparaître.

### 4. Premier commit ?
Vous avez modifié votre code (model.php). Vérifez votre configuration Git/Github en tentant un premier
commit : 
-   git add .
-   git commit -m "update credentials"
-   git push
  
Si tout va bien, vous devez retrouver sur votre espace Github la modification que vous venez de réaliser.
