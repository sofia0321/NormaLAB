(function () {
  "use strict";

  var toggle = document.querySelector("[data-menu-toggle]");
  var sidebar = document.querySelector("[data-sidebar]");
  if (toggle && sidebar) {
    toggle.addEventListener("click", function () { sidebar.classList.toggle("abierto"); });
    document.addEventListener("click", function (e) {
      if (sidebar.classList.contains("abierto") && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove("abierto");
      }
    });
  }

  document.querySelectorAll(".toast").forEach(function (t) {
    var cerrar = function () { t.remove(); };
    t.querySelector("[data-cerrar]").addEventListener("click", cerrar);
    if (t.classList.contains("toast-ok")) setTimeout(cerrar, 4500);
  });

  var modal = document.getElementById("modal-confirmar");
  document.querySelectorAll("form[data-confirmar]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      if (form.dataset.confirmado === "1") return;
      e.preventDefault();
      var texto = form.dataset.confirmar;
      if (!modal || typeof modal.showModal !== "function") {
        if (window.confirm(texto)) { form.dataset.confirmado = "1"; form.submit(); }
        return;
      }
      modal.querySelector("[data-modal-titulo]").textContent = form.dataset.confirmarTitulo || "Confirmar";
      modal.querySelector("[data-modal-texto]").textContent = texto;
      modal.returnValue = "";
      modal.showModal();
      modal.addEventListener("close", function alCerrar() {
        modal.removeEventListener("close", alCerrar);
        if (modal.returnValue === "ok") { form.dataset.confirmado = "1"; form.submit(); }
      });
    });
  });

  document.querySelectorAll("[data-autoenviar]").forEach(function (sel) {
    sel.addEventListener("change", function () { sel.form.submit(); });
  });

  document.querySelectorAll("[data-solo-numeros], [data-regla=numero], [data-regla=anio]").forEach(function (inp) {
    inp.addEventListener("input", function () {
      var limpio = inp.value.replace(/\D+/g, "");
      if (limpio !== inp.value) inp.value = limpio;
    });
  });

  document.querySelectorAll("[data-archivo]").forEach(function (inp) {
    var etiqueta = document.querySelector("[data-archivo-nombre]");
    inp.addEventListener("change", function () {
      if (inp.files && inp.files[0] && etiqueta) etiqueta.textContent = inp.files[0].name;
    });
  });

  var PROHIBIDOS = /[<>"{|}]/;
  var SOLO_LETRAS = /^[A-Za-záéíóúüÁÉÍÓÚÜñÑ\s.,\-'()]+$/;
  function validar(inp) {
    var v = inp.value.trim();
    var nombre = inp.dataset.nombre || "Campo";
    var oblig = inp.hasAttribute("required");
    var regla = inp.dataset.regla;
    if (!v) return oblig ? "El campo '" + nombre + "' es obligatorio." : "";
    if (regla === "numero" && !/^\d+$/.test(v)) return "El campo '" + nombre + "' solo permite números.";
    if (regla === "anio") {
      if (!/^\d+$/.test(v)) return "El año solo permite números enteros (p. ej. 2025).";
      var a = parseInt(v, 10), max = parseInt(inp.dataset.max || "9999", 10);
      if (a < 1900) return "El año no puede ser menor a 1900.";
      if (a > max) return "El año no puede ser mayor a " + max + ".";
    }
    if (regla === "texto") {
      if (/\d/.test(v)) return "El campo '" + nombre + "' solo permite letras y espacios. Retire los números ingresados.";
      if (!SOLO_LETRAS.test(v)) return "El campo '" + nombre + "' solo permite letras y espacios.";
    }
    if (regla === "desc" && PROHIBIDOS.test(v)) return "El campo '" + nombre + "' contiene caracteres no permitidos (< > \" { | }).";
    return "";
  }
  function mostrar(inp, msg) {
    var grupo = inp.closest(".campo-grupo");
    if (!grupo) return;
    var span = grupo.querySelector(".error-campo[data-vivo]");
    var spanServidor = grupo.querySelector(".error-campo:not([data-vivo])");
    if (spanServidor) spanServidor.remove();
    if (!span) {
      span = document.createElement("span");
      span.className = "error-campo";
      span.setAttribute("data-vivo", "");
      inp.insertAdjacentElement("afterend", span);
    }
    span.textContent = msg;
    span.hidden = !msg;
    grupo.classList.toggle("invalido", !!msg);
  }
  document.querySelectorAll("form[data-validar]").forEach(function (form) {
    var campos = form.querySelectorAll("[data-regla]");
    campos.forEach(function (inp) {
      inp.addEventListener("blur", function () { mostrar(inp, validar(inp)); });
      inp.addEventListener("input", function () {
        if (inp.closest(".campo-grupo.invalido")) mostrar(inp, validar(inp));
      });
    });
    form.addEventListener("submit", function (e) {
      var primero = null;
      campos.forEach(function (inp) {
        var msg = validar(inp);
        mostrar(inp, msg);
        if (msg && !primero) primero = inp;
      });
      if (primero) { e.preventDefault(); primero.focus(); }
    });
  });
})();
