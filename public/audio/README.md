# Música

Deja aquí las pistas (`.mp3` u `.ogg`) y descríbelas en `tracks.json`. Mientras el archivo
esté vacío (`[]`), Wrappsapp suena con música generada en el navegador, que cambia de
escena según la diapositiva.

Solo pistas libres de derechos con licencia compatible (Pixabay Music, CC0, YouTube Audio
Library…). Nada de canciones comerciales.

```json
[
  {
    "id": "summer-pop",
    "file": "summer-pop.mp3",
    "title": "Summer Pop",
    "author": "Nombre del autor",
    "license": "Pixabay Content License",
    "url": "https://pixabay.com/music/…",
    "bpm": 118,
    "vibes": ["risas", "caos", "familia"]
  }
]
```

- `bpm`: las animaciones laten a ese compás, así que conviene que sea exacto.
- `vibes`: con qué personalidades de chat encaja la pista. Valores posibles: `duo`, `radio`,
  `madrugada`, `memes`, `risas`, `debate`, `rayo`, `caos`, `pocos`, `familia`. Una lista vacía
  significa "vale para cualquiera".

Añade cada pista a `CREDITS.md` con su autor, licencia y enlace.
