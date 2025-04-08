let templateFile = await fetch("./component/NavBar/Movie/template.html");
let template = await templateFile.text();

let Movie = {};
Movie.format = function (movies) {
  // préventio s'il n'y a pas de films
  if (movies.length === 0) {
    return "<p>Il n'y a pas de film dans la catégorie.</p>";
  }
  let html = "";
  movies.forEach((movie) => {
    let movieHtml = template;
    movieHtml = movieHtml.replace("{{titre}}", movie.name);
    movieHtml = movieHtml.replace("{{image}}", movie.image);
    movieHtml = movieHtml.replace("{{handler}}",`C.handlerDetail(${movie.id})`);

    html += movieHtml;
  });
  return html;
};

export { Movie };