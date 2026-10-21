import { useState, useEffect, useMemo } from "react";
import { BookOpen, ChevronLeft, ChevronRight, List, X } from "lucide-react";
import librosBiblia from "../data/bibleBooks.json";
import { fetchBibleChapter } from "../services/bibleService";

export const BibliaPage = () => {
  const [libroSeleccionado, setLibroSeleccionado] = useState("JHN");
  const [capituloActual, setCapituloActual] = useState(3);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reintento, setReintento] = useState(0);
  const [mostrarMenu, setMostrarMenu] = useState(false);

  const libroActual = useMemo(
    () => librosBiblia.find((l) => l.id === libroSeleccionado),
    [librosBiblia, libroSeleccionado]
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setTexto("");
    setError("");

    fetchBibleChapter(libroSeleccionado, capituloActual, controller.signal)
      .then((chapterText) => {
        if (active) setTexto(chapterText);
      })
      .catch(() => {
        if (active) setError("No se pudo cargar el capítulo. Intenta nuevamente.");
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [libroSeleccionado, capituloActual, reintento]);

  const cambiarPagina = (direccion) => {
    if (!libroActual) return;

    let nuevoCap = capituloActual + direccion;
    let nuevoLibro = libroSeleccionado;

    if (nuevoCap > libroActual.caps) {
      const indexLibroActual = librosBiblia.findIndex((l) => l.id === libroSeleccionado);
      if (indexLibroActual < librosBiblia.length - 1) {
        nuevoLibro = librosBiblia[indexLibroActual + 1].id;
        nuevoCap = 1;
      } else {
        return;
      }
    }

    if (nuevoCap < 1) {
      const indexLibroActual = librosBiblia.findIndex((l) => l.id === libroSeleccionado);
      if (indexLibroActual > 0) {
        nuevoLibro = librosBiblia[indexLibroActual - 1].id;
        const libroAnterior = librosBiblia[indexLibroActual - 1];
        nuevoCap = libroAnterior.caps;
      } else {
        return;
      }
    }

    setLibroSeleccionado(nuevoLibro);
    setCapituloActual(nuevoCap);
  };

  const seleccionarLibroCapitulo = (libro, cap) => {
    setLibroSeleccionado(libro);
    setCapituloActual(cap);
    setMostrarMenu(false);
  };

  const parrafos = useMemo(
    () => texto.split("\n\n").filter((p) => p.trim()),
    [texto]
  );
  const mitad = Math.ceil(parrafos.length / 2);
  const columnaIzquierda = parrafos.slice(0, mitad);
  const columnaDerecha = parrafos.slice(mitad);

  const esPrimeraPagina = libroSeleccionado === "Genesis" && capituloActual === 1;
  const esUltimaPagina = libroSeleccionado === "Revelation" && capituloActual === 22;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <BookOpen className="text-sage-700" size={40} />
            <h1 className="text-4xl md:text-5xl font-serif text-sage-900">Sagrada Biblia</h1>
          </div>
          <p className="text-sage-700 text-sm tracking-wider">REINA-VALERA 1909 · DOMINIO PÚBLICO</p>
          <p className="text-xs text-sage-600 mt-2">Edición de 66 libros; no incluye los deuterocanónicos. <a href="/biblia/rv1909/SOURCE.md" target="_blank" rel="noreferrer" className="underline">Fuente y licencia</a></p>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/10 rounded-lg transform translate-y-2 blur-xl"></div>

          <div className="relative bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-amber-200">
            <div className="grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
              <div className="p-8 md:p-12 bg-gradient-to-br from-amber-50 to-white border-r-2 border-amber-200/50 relative">
                <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-sage-300 opacity-30"></div>
                <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-sage-300 opacity-30"></div>

                <div className="h-full flex flex-col">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-700 mx-auto mb-4"></div>
                        <p className="text-sage-600 text-sm">Cargando...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6 pb-4 border-b-2 border-sage-200">
                        <h2 className="text-2xl font-serif text-sage-900 text-center">
                          {libroActual?.nombre || libroSeleccionado}
                        </h2>
                        <p className="text-center text-3xl font-elegant text-sage-700 mt-2">
                          Capítulo {capituloActual}
                        </p>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-4" style={{ maxHeight: "450px" }}>
                        {error && (
                          <div role="alert" className="space-y-4">
                            <p className="text-gray-800">{error}</p>
                            <button type="button" className="btn-secondary" onClick={() => setReintento((value) => value + 1)}>
                              Reintentar
                            </button>
                          </div>
                        )}
                        {columnaIzquierda.map((parrafo, i) => (
                          <p key={i} className="text-gray-800 leading-relaxed mb-4 text-justify font-serif">
                            {parrafo}
                          </p>
                        ))}
                      </div>

                      <div className="text-center mt-4 pt-4 border-t border-sage-200">
                        <span className="text-xs text-sage-500 font-serif">~ {capituloActual} ~</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-8 md:p-12 bg-gradient-to-bl from-amber-50 to-white relative">
                <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-sage-300 opacity-30"></div>
                <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-sage-300 opacity-30"></div>

                <div className="h-full flex flex-col">
                  {!loading && (
                    <>
                      <div className="flex-1 overflow-y-auto pr-4 mt-20" style={{ maxHeight: "450px" }}>
                        {columnaDerecha.map((parrafo, i) => (
                          <p key={i} className="text-gray-800 leading-relaxed mb-4 text-justify font-serif">
                            {parrafo}
                          </p>
                        ))}
                      </div>

                      <div className="text-center mt-4 pt-4 border-t border-sage-200">
                        <span className="text-xs text-sage-500 font-serif">~ {capituloActual} ~</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-sage-800 to-sage-900 p-4">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                <button
                  onClick={() => cambiarPagina(-1)}
                  aria-label="Capítulo anterior"
                  disabled={esPrimeraPagina}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                  <span className="hidden sm:inline text-sm">Anterior</span>
                </button>

                <button
                  onClick={() => setMostrarMenu(!mostrarMenu)}
                  className="flex items-center gap-2 px-6 py-3 bg-white text-sage-800 rounded-md hover:bg-sage-50 transition-all font-medium shadow-md"
                >
                  <List size={20} />
                  <span className="text-sm">Índice</span>
                </button>

                <button
                  onClick={() => cambiarPagina(1)}
                  aria-label="Capítulo siguiente"
                  disabled={esUltimaPagina}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline text-sm">Siguiente</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {mostrarMenu && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="bg-gradient-to-r from-sage-700 to-sage-800 p-6 flex items-center justify-between">
                <h3 className="text-2xl font-serif text-white">Índice de la Biblia</h3>
                <button
                  onClick={() => setMostrarMenu(false)}
                  aria-label="Cerrar índice"
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="text-white" size={24} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(80vh - 100px)" }}>
                <div className="mb-8">
                  <h4 className="text-xl font-serif text-sage-900 mb-4 pb-2 border-b-2 border-sage-200">
                    Antiguo Testamento
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {librosBiblia
                      .filter((l) => l.testamento === "AT")
                      .map((libro) => (
                        <div
                          key={libro.id}
                          className="border border-sage-200 rounded-lg p-3 hover:bg-sage-50 transition-colors"
                        >
                          <p className="font-semibold text-sage-900 mb-2">{libro.nombre}</p>
                          <div className="flex flex-wrap gap-1">
                            {Array.from({ length: Math.min(libro.caps, 10) }, (_, i) => (
                              <button
                                key={i + 1}
                                onClick={() => seleccionarLibroCapitulo(libro.id, i + 1)}
                                className="px-2 py-1 text-xs bg-sage-100 hover:bg-sage-700 hover:text-white rounded transition-colors"
                              >
                                {i + 1}
                              </button>
                            ))}
                            {libro.caps > 10 && (
                              <span className="px-2 py-1 text-xs text-sage-600">+{libro.caps - 10}</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xl font-serif text-sage-900 mb-4 pb-2 border-b-2 border-sage-200">
                    Nuevo Testamento
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {librosBiblia
                      .filter((l) => l.testamento === "NT")
                      .map((libro) => (
                        <div
                          key={libro.id}
                          className="border border-sage-200 rounded-lg p-3 hover:bg-sage-50 transition-colors"
                        >
                          <p className="font-semibold text-sage-900 mb-2">{libro.nombre}</p>
                          <div className="flex flex-wrap gap-1">
                            {Array.from({ length: libro.caps }, (_, i) => (
                              <button
                                key={i + 1}
                                onClick={() => seleccionarLibroCapitulo(libro.id, i + 1)}
                                className="px-2 py-1 text-xs bg-sage-100 hover:bg-sage-700 hover:text-white rounded transition-colors"
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
