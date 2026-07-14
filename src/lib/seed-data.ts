import { DEFAULT_INTERPRETATION_DISCLAIMER } from "@/lib/interpretation";
import type { AIRun, Artist, Comment, Movie, Song } from "@/lib/types";

export const seedArtists: Artist[] = [
  {
    id: "artist-ada",
    slug: "ada-rivers",
    name: "Ada Rivers",
    bio: "Independent vocalist and songwriter known for intimate acoustic arrangements.",
  },
  {
    id: "artist-nova",
    slug: "the-nova-collective",
    name: "The Nova Collective",
    bio: "A multilingual studio collective pairing electronic textures with traditional instruments.",
  },
  {
    id: "artist-trad",
    slug: "traditional",
    name: "Traditional",
    bio: "Folk and public-domain works carried through generations.",
  },
  {
    id: "artist-luca",
    slug: "luca-marin",
    name: "Luca Marín",
    bio: "Spanish-language composer creating warm, cinematic pop.",
  },
];

export const seedMovies: Movie[] = [
  {
    id: "movie-skyline",
    slug: "after-the-skyline",
    title: "After the Skyline",
    year: 2025,
    description: "An independent road film about finding a new home in a changing city.",
  },
  {
    id: "movie-monsoon",
    slug: "monsoon-letters",
    title: "Monsoon Letters",
    year: 2026,
    description: "A multilingual drama told through music, memory, and letters never sent.",
  },
];

const now = "2026-07-12T00:00:00.000Z";

export const seedSongs: Song[] = [
  {
    id: "song-city-lights",
    slug: "city-lights",
    title: "City Lights",
    description:
      "A hopeful synth-pop song about choosing connection over the noise of a restless city. This original demo work was written for Lyranta.",
    releaseYear: 2026,
    language: "English",
    category: "New releases",
    genre: "Synth pop",
    tags: ["city", "hope", "night drive"],
    artistIds: ["artist-ada", "artist-nova"],
    artists: [seedArtists[0], seedArtists[1]],
    movie: seedMovies[0],
    movieId: "movie-skyline",
    lyrics: [
      {
        id: "lyric-city-en",
        language: "English",
        languageCode: "en",
        type: "original",
        source: "Lyranta original demo",
        text: `Street signs flicker like a quiet constellation
Every window holds a world I’ll never know
Then your voice cuts through the midnight conversation
And suddenly the city feels like home

Under the city lights, we’re finding our way
Turning all the noise into something we can say
No map, no finish line, just your hand in mine
We come alive under the city lights`,
      },
      {
        id: "lyric-city-hi",
        language: "Hindi",
        languageCode: "hi",
        type: "translation",
        source: "Lyranta editorial translation",
        text: `शहर की रोशनी में राह मिल रही है
हर शोर में अपनी बात खिल रही है
न नक्शा, न मंज़िल, बस हाथों में हाथ
इन रोशनियों में जागे अपने जज़्बात`,
      },
    ],
    platformLinks: [
      { platform: "Spotify", url: "https://open.spotify.com/" },
      { platform: "YouTube Music", url: "https://music.youtube.com/" },
      { platform: "Apple Music", url: "https://music.apple.com/" },
    ],
    interpretation: {
      status: "published",
      summary:
        "“City Lights” presents connection as an answer to urban isolation. The city first feels anonymous and overwhelming, but a familiar voice transforms that same environment into a place of belonging and possibility.",
      themes: ["connection", "belonging", "urban isolation", "hope"],
      sections: [
        {
          id: "meaning-city-verse",
          label: "Verse",
          meaning:
            "The opening city imagery emphasizes distance between people. Countless lit windows suggest lives happening close together while still feeling unreachable.",
        },
        {
          id: "meaning-city-chorus",
          label: "Chorus",
          meaning:
            "The chorus shifts from observation to participation. Shared direction matters more than having a fixed destination, turning the lights from background noise into a symbol of hope.",
        },
      ],
      culturalContext:
        "The song uses the modern city as both a source of loneliness and a setting for reinvention. Its night-drive imagery follows a familiar pop tradition in which movement through illuminated streets represents emotional change.",
      disclaimer: DEFAULT_INTERPRETATION_DISCLAIMER,
    },
    status: "published",
    featured: true,
    views: 18420,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "song-monsoon",
    slug: "baarish-ke-khat",
    title: "बारिश के ख़त",
    alternateTitle: "Baarish Ke Khat",
    description:
      "A gentle Hindi ballad about memories returning with the first monsoon rain. An original Lyranta demonstration work.",
    releaseYear: 2026,
    language: "Hindi",
    category: "Movie songs",
    genre: "Bollywood",
    tags: ["monsoon", "letters", "romance"],
    artistIds: ["artist-nova", "artist-ada"],
    artists: [seedArtists[1], seedArtists[0]],
    movie: seedMovies[1],
    movieId: "movie-monsoon",
    lyrics: [
      {
        id: "lyric-monsoon-hi",
        language: "Hindi",
        languageCode: "hi",
        type: "original",
        source: "Lyranta original demo",
        text: `पहली बूँद ने खिड़की पर
तेरा नाम फिर लिख दिया
भीगे काग़ज़ की ख़ुशबू ने
बीता मौसम खोल दिया

बारिश के ख़त आते रहे
तेरी बातें लाते रहे
हमने जो शब्द कहे नहीं
बादल उन्हें दोहराते रहे`,
      },
      {
        id: "lyric-monsoon-latin",
        language: "Hindi (Latin)",
        languageCode: "hi-Latn",
        type: "transliteration",
        source: "Lyranta editorial transliteration",
        text: `Pehli boond ne khidki par
Tera naam phir likh diya
Bheege kaagaz ki khushboo ne
Beeta mausam khol diya

Baarish ke khat aate rahe
Teri baatein laate rahe
Humne jo shabd kahe nahin
Baadal unhein dohraate rahe`,
      },
    ],
    platformLinks: [
      { platform: "JioSaavn", url: "https://www.jiosaavn.com/" },
      { platform: "YouTube Music", url: "https://music.youtube.com/" },
    ],
    interpretation: {
      status: "published",
      summary:
        "“बारिश के ख़त” treats the first monsoon rain as a messenger that reopens an unfinished relationship. Memories become like letters carried by clouds, giving a voice to feelings the speakers never expressed directly.",
      themes: ["memory", "unspoken love", "monsoon", "longing"],
      sections: [
        {
          id: "meaning-monsoon-verse",
          label: "Verse",
          meaning:
            "Rain touching the window triggers a private memory. The image of a name being written again suggests that the past has returned without being deliberately invited.",
        },
        {
          id: "meaning-monsoon-chorus",
          label: "Chorus",
          meaning:
            "The recurring rain becomes a series of letters. The clouds repeat words that remained unsaid, so weather acts as the emotional voice the separated pair could not find.",
        },
      ],
      culturalContext:
        "Monsoon imagery carries a long association with reunion, separation, and romantic longing in South Asian poetry, film, and music. The word “ख़त” means a letter and gives the rain a tangible role as a carrier of memory.",
      disclaimer: DEFAULT_INTERPRETATION_DISCLAIMER,
    },
    status: "published",
    featured: true,
    views: 32104,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "song-twinkle",
    slug: "twinkle-twinkle-little-star",
    title: "Twinkle, Twinkle, Little Star",
    description:
      "The familiar English nursery song, based on the early nineteenth-century poem “The Star” by Jane Taylor.",
    releaseYear: 1806,
    language: "English",
    category: "Kids",
    genre: "Nursery rhyme",
    tags: ["children", "stars", "public domain"],
    artistIds: ["artist-trad"],
    artists: [seedArtists[2]],
    lyrics: [
      {
        id: "lyric-twinkle-en",
        language: "English",
        languageCode: "en",
        type: "original",
        source: "Public-domain text",
        text: `Twinkle, twinkle, little star,
How I wonder what you are!
Up above the world so high,
Like a diamond in the sky.

Twinkle, twinkle, little star,
How I wonder what you are!`,
      },
      {
        id: "lyric-twinkle-es",
        language: "Spanish",
        languageCode: "es",
        type: "translation",
        source: "Lyranta editorial adaptation",
        text: `Brilla, brilla, estrella,
¿cómo eres tú?
Sobre el mundo, tan arriba,
como un diamante de luz.`,
      },
    ],
    platformLinks: [{ platform: "YouTube Music", url: "https://music.youtube.com/" }],
    status: "published",
    views: 91028,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "song-amazing-grace",
    slug: "amazing-grace",
    title: "Amazing Grace",
    description:
      "John Newton’s enduring eighteenth-century hymn about redemption and hope, presented from public-domain text.",
    releaseYear: 1779,
    language: "English",
    category: "Devotional",
    genre: "Hymn",
    tags: ["faith", "hope", "public domain"],
    artistIds: ["artist-trad", "artist-ada"],
    artists: [seedArtists[2], seedArtists[0]],
    lyrics: [
      {
        id: "lyric-grace-en",
        language: "English",
        languageCode: "en",
        type: "original",
        source: "Public-domain text by John Newton",
        text: `Amazing grace! How sweet the sound
That saved a wretch like me!
I once was lost, but now am found;
Was blind, but now I see.

’Twas grace that taught my heart to fear,
And grace my fears relieved;
How precious did that grace appear
The hour I first believed.`,
      },
    ],
    platformLinks: [
      { platform: "Spotify", url: "https://open.spotify.com/" },
      { platform: "Apple Music", url: "https://music.apple.com/" },
    ],
    status: "published",
    views: 143221,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "song-cerca-del-mar",
    slug: "cerca-del-mar",
    title: "Cerca del Mar",
    description:
      "An original Spanish acoustic song about returning to a familiar coast and finding perspective in the tide.",
    releaseYear: 2025,
    language: "Spanish",
    category: "Independent",
    genre: "Acoustic pop",
    tags: ["sea", "homecoming", "acoustic"],
    artistIds: ["artist-luca"],
    artists: [seedArtists[3]],
    lyrics: [
      {
        id: "lyric-mar-es",
        language: "Spanish",
        languageCode: "es",
        type: "original",
        source: "Lyranta original demo",
        text: `Vuelvo al camino de arena
Donde aprendí a escuchar
Todo lo que el viento cuenta
Cuando se acerca al mar

Cerca del mar, vuelvo a respirar
La marea sabe todo lo que quiero olvidar`,
      },
    ],
    platformLinks: [{ platform: "Spotify", url: "https://open.spotify.com/" }],
    status: "published",
    views: 12765,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "song-paper-moons",
    slug: "paper-moons",
    title: "Paper Moons",
    description:
      "A dreamy unreleased editorial sample queued for review, demonstrating Lyranta’s publishing workflow.",
    releaseYear: 2026,
    language: "English",
    category: "New releases",
    genre: "Dream pop",
    tags: ["dreams", "moon", "editorial"],
    artistIds: ["artist-nova"],
    artists: [seedArtists[1]],
    lyrics: [
      {
        id: "lyric-paper-en",
        language: "English",
        languageCode: "en",
        type: "original",
        source: "Lyranta original demo",
        text: "We hung paper moons above the avenue\nAnd watched them turn the midnight silver-blue.",
      },
    ],
    platformLinks: [],
    status: "review",
    views: 0,
    createdAt: now,
    updatedAt: now,
  },
];

export const seedComments: Comment[] = [
  {
    id: "comment-1",
    songId: "song-city-lights",
    name: "Maya",
    email: "maya@example.com",
    body: "The Hindi translation keeps the feeling of the chorus beautifully.",
    status: "approved",
    createdAt: "2026-07-10T12:00:00.000Z",
  },
  {
    id: "comment-2",
    songId: "song-monsoon",
    name: "Arjun",
    email: "arjun@example.com",
    body: "The transliteration makes this much easier to sing along with.",
    status: "approved",
    createdAt: "2026-07-11T08:30:00.000Z",
  },
];

export const seedAIRuns: AIRun[] = [
  {
    id: "run-demo",
    status: "needs_review",
    source: "manual",
    summary: "Found one possible 2026 release; source verification required.",
    candidates: 1,
    details: "Demo run. No copyrighted lyrics were imported.",
    createdAt: "2026-07-12T05:00:00.000Z",
  },
];
