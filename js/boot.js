/* Se carga en el <head> antes de pintar la página.
   Activa las animaciones (.mo) y, si main.js no llega a cargar en 2.5 s,
   las quita para que todo el contenido quede visible. */
document.documentElement.classList.add("js", "mo");
setTimeout(function () {
  if (!window.LOCKER_MOTION) document.documentElement.classList.remove("mo");
}, 2500);
