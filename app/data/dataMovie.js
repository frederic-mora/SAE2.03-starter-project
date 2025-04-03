let HOST_URL = "..";//"http://mmi.unilim.fr/~????"; // CHANGE THIS TO MATCH YOUR CONFIG

let DataMovie = {};

 /**
     * Fetches data from the server based on the specified day.
     *
     * @param {string} day - The day parameter to be sent to the server.
     * @returns The response from the server.
     * 
     * DataMenu.request permet de récupérer des données depuis le serveur.
     * Elle prend en paramètre un jour (lundi mardi...) de la semaine et 
     * renvoie les données contenues dans la réponse du serveur (data).
     */
DataMenu.requestMovies = async function(day){
    // fetch permet d'envoyer une requête HTTP à l'URL spécifiée. 
    // L'URL est construite en concaténant HOST_URL à "/server/script.php?direction=" et la valeur de la variable dir. 
    // L'URL finale dépend de la valeur de HOST_URL et de dir.
    let answer = await fetch(HOST_URL + "/server/script.php?todo=readmovies");
    // answer est la réponse du serveur à la requête fetch.
    // On utilise ensuite la méthode json() pour extraire de cette réponse les données au format JSON.
    // Ces données (data) sont automatiquement converties en objet JavaScript.
    let data = await answer.json();
    // Enfin, on retourne ces données.
    return data;
}


export {DataMovie};