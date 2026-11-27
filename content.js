/* =====================================================================
   THE LITTLE UNIVERSE I MADE FOR YOU — EDITABLE CONTENT
   ---------------------------------------------------------------------
   Everything Himani reads lives in this one file, written in my voice.
   Change any text here; you never need to touch script.js or index.html.

   Tips
   - Keep the quotes "..." around text. Use \n for a line break and
     \n\n for a new paragraph inside long messages.
   - Photos: put image files in assets/photos/ and set `src` below,
     e.g. src: "assets/photos/beach.jpg". Leave src empty ("") to show
     a pretty empty frame until you add one.
   ===================================================================== */

window.CONTENT = {
  // The signature at the end of the final love letter.
  signature: "Your silly human ❤️",

  /* ---------- Scene 1: A message from the universe ---------- */
  intro: [
    "Somewhere in this enormous universe...",
    "There is one person who makes my little world special.",
    "Himani, today I made something just for you."
  ],

  /* ---------- Scene 2: The magical door ---------- */
  doorText: "Himani, I've been waiting to tell you something...",

  /* ---------- Scene 3: The apology cinema ---------- */
  apology: {
    greeting: "Hey Himani, my favourite person...",
    paragraphs: [
      "I know I made mistakes, and I know my actions hurt you.",
      "I don't want to make excuses or pretend that a few words can fix everything.",
      "I'm genuinely sorry.",
      "You deserve to feel heard, respected, understood, and loved. Always.",
      "I can't change what happened, but I can take responsibility for it and work on becoming better.",
      "I don't expect you to forget everything instantly. I just wanted you to know how much your feelings matter to me."
    ]
  },

  /* ---------- Scene 4: The happiness lab ---------- */
  hugText: "Himani, this is me hugging you. Tight, and for as long as you want.",
  compliments: [
    "Himani, your smile could power a small city.",
    "You make my ordinary days feel like little adventures.",
    "Your kindness is quietly magical, and I notice it every time.",
    "You have the best laugh in this entire universe. I checked.",
    "Talking to you is my favourite part of any day.",
    "I love that you're completely, wonderfully yourself.",
    "My world is softer because you're in it.",
    "You notice the little things, Himani. That's rare.",
    "You're braver than you give yourself credit for.",
    "Even your sleepy face is unfairly cute.",
    "You make me feel at home.",
    "My official finding: you are 100% adorable."
  ],
  scientistNotes: [
    "Research note: smiles are contagious. I'm hoping yours comes back soon.",
    "Research note: my hugs are reserved for Himani only.",
    "Research note: flowers grow faster when you're around. So do I.",
    "Research note: still no cure for missing you.",
    "Research note: I built this whole lab just to make you smile."
  ],

  /* ---------- Scene 5: Collect the little hearts (mini-game) ---------- */
  // One message is revealed for every heart or star she collects.
  gameMessages: [
    "You make my days brighter, Himani.",
    "Thank you for being you.",
    "You deserve gentle days.",
    "Your happiness matters to me.",
    "Every heart here is mine, and it's yours.",
    "A tiny star for the biggest heart I know.",
    "I'm proud of you, by the way.",
    "Here's a little sparkle for your day.",
    "I put every one of these here for you.",
    "Keep going, I'm cheering for you."
  ],
  // Unlocked after collecting five hearts.
  secretLetter: {
    title: "A secret letter 💌",
    text: "You found all five hearts, Himani!\n\nI picked five because there are five things I want you to feel every day: comfort, kindness, laughter, peace, and listened to.\n\nI want to be the person who gives you those. I'm working on it, a little more every day."
  },

  /* ---------- Scene 6: The garden of little things ----------
     Each card shows a cute built-in illustration. To show a real photo
     instead (say, a picture of her smiling), set image, e.g.
     image: "assets/photos/garden-smile.jpg"   */
  flowers: [
    { title: "Your beautiful smile", message: "It changes the whole mood of a room, Himani. It changes mine every single time.", image: "assets/photos/image1.jpg", alt: "Himani smiling" },
    { title: "Your laughter", message: "It's my favourite sound. I'd happily be silly forever just to hear it.", image: "assets/photos/image2.jpg", alt: "Himani laughing" },
    { title: "Your kindness", message: "You care about people in a way that makes them feel safe. I see it, always.", image: "assets/photos/image3.jpg", alt: "Himani" },
    { title: "Your little habits", message: "The tiny things you do without even thinking are some of my favourite things in the world.", image: "assets/photos/image4.jpg", alt: "Himani" },
    { title: "Your personality", message: "Funny, thoughtful, stubborn in the best way. There is nobody quite like you.", image: "assets/photos/image5.jpg", alt: "Himani" },
    { title: "The way you make ordinary moments special", message: "With you, even doing nothing feels like a memory worth keeping.", image: "assets/photos/image6.jpg", alt: "Himani" },
    { title: "Simply being yourself", message: "You don't have to be anything more, Himani. You being you is already more than enough for me.", image: "assets/photos/image7.jpg", alt: "Himani smiling" }
  ],

  /* ---------- Scene 7: Our little memory museum ---------- */
  // Add our real photos here. Nothing is invented: fill in our own memories.
  // Empty `src` shows a decorated empty frame.
  // Dates below come from the screenshot timestamps. Replace the captions
  // and messages with our real memories.
  photos: [
    { src: "assets/photos/image1.jpg", date: "10 May 2026", caption: "Add a caption", message: "Write the memory behind this photo in content.js." },
    { src: "assets/photos/image2.jpg", date: "17 Jun 2026", caption: "Add a caption", message: "Write the memory behind this photo in content.js." },
    { src: "assets/photos/image3.jpg", date: "17 Jun 2026", caption: "Add a caption", message: "Write the memory behind this photo in content.js." },
    { src: "assets/photos/image4.jpg", date: "17 Jun 2026", caption: "Add a caption", message: "Write the memory behind this photo in content.js." },
    { src: "assets/photos/image5.jpg", date: "27 Jun 2026", caption: "Add a caption", message: "Write the memory behind this photo in content.js." },
    { src: "assets/photos/image6.jpg", date: "21 Jul 2026", caption: "Add a caption", message: "Write the memory behind this photo in content.js." },
    { src: "assets/photos/image7.jpg", date: "3 Sep 2026", caption: "Add a caption", message: "Write the memory behind this photo in content.js." },
    { src: "assets/photos/image8.jpg", date: "3 Sep 2026", caption: "Add a caption", message: "Write the memory behind this photo in content.js." },
    { src: "assets/photos/image9.jpg", date: "3 Sep 2026", caption: "Add a caption", message: "Write the memory behind this photo in content.js." },
    { src: "assets/photos/image10.jpg", date: "3 Sep 2026", caption: "Add a caption", message: "Write the memory behind this photo in content.js." },
    // featured: true → shown in the middle of the museum, bigger than the rest
    { src: "assets/photos/image11.jpg", date: "Add a date", caption: "Add a caption", message: "Write the memory behind this photo in content.js.", featured: true }
  ],

  /* ---------- Scene 8: The broken star repair shop ---------- */
  starIntro: "Himani, some things need more than a simple sorry. They need patience, understanding, and effort.",
  promises: [
    "I'll listen to you more carefully.",
    "I'll try to understand before I react.",
    "I'll take responsibility for what I do.",
    "I'll respect your feelings.",
    "I'll work on my mistakes.",
    "I'll show you the change through my actions."
  ],
  starRestored: "These promises are only a beginning, Himani. I'll keep them through what I do, one day at a time.",

  /* ---------- Scene 9: The secret constellation ---------- */
  // Eight stars form a hidden shape. Each reveals one message.
  constellation: [
    "Himani, you deserve all the beautiful things life has to offer.",
    "Even our smallest moments became my sweetest memories.",
    "I'm sending you a thousand invisible hugs.",
    "You're my favourite notification.",
    "The stars are pretty, but they're not you.",
    "I hope today treats you gently.",
    "You make this big universe feel like home to me.",
    "Wherever you are, I'm cheering for you."
  ],
  specialStar: {
    title: "The brightest star 🌟",
    text: "Himani, out of every star in this sky, I picked this one for you.\n\nNot because it's the biggest, but because it reminds me of you: warm, steady, and impossible to ignore once you've noticed it.\n\nI know I dimmed things between us for a while. I'm not asking you to pretend that didn't happen. I just want you to know that I see how much light you bring, and I want to be someone who protects it, not someone who hides it.\n\nThank you for being the brightest thing in my sky."
  },

  /* ---------- Scene 10: The time capsule ---------- */
  capsule: {
    letter: "Himani,\n\nI'm sorry. Not the quick kind of sorry, but the kind that comes after really thinking about what I did and why it hurt you.\n\nYou didn't deserve that. I'm keeping this letter here so I never forget the lesson.",
    photosNote: "Our photos, kept safe for the future.",
    promisesTitle: "Promises I'm keeping for you",
    future: "Dear future us,\n\nI hope we look back on this as the moment I started doing better, and meant it.\n\nI hope there are more silly days, quiet nights, long talks, and inside jokes than either of us can count.\n\nAnd Himani, I hope you always know how loved you are."
  },

  /* ---------- Scene 11: The final love letter ---------- */
  finalLetter: "Hey Himani,\n\nI know I haven't always handled things the way I should have.\n\nI know my mistakes hurt you, and I am genuinely sorry.\n\nI didn't want this little website to be just a collection of pretty animations and cute characters.\n\nI wanted to make something different to tell you that you matter to me.\n\nI know that trust, understanding, and happiness are built through actions, not just words.\n\nI want to learn from my mistakes and become better, for you and for us.\n\nYou don't owe me an instant reply or instant forgiveness. Take all the time you need.\n\nI just hope this little universe made your day a little brighter.\n\nNever forget how special you are.\n\nWith love,",

  /* ---------- Scene 12: The final surprise ---------- */
  ending: [
    "That's the end of my little universe, Himani...",
    "But I hope your happiness never ends."
  ],
  endingHug: "Wrapping you in the softest, longest hug I can give.",
  endingFlower: "A flower from me. Every one you send keeps growing in this sky.",
  lastSurprise: {
    title: "One last surprise 🎁",
    text: "Himani, I made this whole universe for one person, and it was always you.\n\nWhenever you need a smile, come back here. The bunny, the stars, and the flowers will be waiting.\n\nAnd so will I, patiently."
  },
  finalText: "Made with love, a little creativity, and a very sincere sorry. ❤️",

  /* ---------- Little surprises that pop up while exploring ---------- */
  surprises: [
    "Psst, Himani... you're doing great 💖",
    "A tiny reminder from me: you are loved 🌷",
    "Drink some water, cutie 💧",
    "This balloon is carrying a hug from me 🫂",
    "The bunny says hi. So do I 🐰",
    "I hope you're smiling a little right now ✨",
    "I'm thinking about you right now 💭",
    "You deserve a cozy day ☁️"
  ],

  /* ---------- Hidden objects (find them all!) ---------- */
  secrets: [
    "Secret #1: You found my shooting star. Make a wish, Himani! 🌠",
    "Secret #2: I sent this snail to tell you you're lovely. It took 3 weeks to get here. 🐌",
    "Secret #3: The lab cat approves of you. So do I. 🐱",
    "Secret #4: I hid a tiny house for tiny hugs under this mushroom. 🍄",
    "Secret #5: The moon and I have both been watching over you. 🌙"
  ],

  /* ---------- What the little companion star says ----------
     Twinkle speaks for me. */
  companionLines: [
    "Hi Himani! It's me, in tiny star form ✨",
    "You can tap me any time.",
    "I hid 5 secrets in this universe for you 👀",
    "I like you. A lot. Just saying.",
    "Take your time, there's no rush here.",
    "Psst. Click on everything. I put surprises everywhere."
  ],
  // Tips shown when she arrives at a chapter (numbers are chapters minus one).
  companionHints: {
    1: "Hi Himani! I'm Twinkle. I'll keep you company on this little trip ✨",
    3: "I built every machine in this lab for you. They all really work!",
    5: "Tap the buds. Each one has something I love about you 🌱",
    6: "Psst… you can drag the stickers around.",
    7: "Each glowing fragment is a promise I'm making to you ⭐",
    8: "I hid messages in the twinkling stars. One is extra special.",
    9: "Open everything I put inside the capsule 🔮"
  },

  /* ---------- Small status lines around the site ---------- */
  little: {
    musicTip: "Tip: tap 🎵 at the top. I picked some soft music for you",
    doorOpened: "Look, Himani! I left something for you…",
    doorRevisit: "My letter is still waiting for you 💌",
    gardenDone: "The whole garden is blooming, just for you, Himani 🌷",
    constellationDone: "You found the heart I hid in the sky 💗 Now tap the brightest star in the middle.",
    constellationTwinkle: "That's my heart up there. Now try the big golden star 🌟",
    capsuleDone: "You opened everything I saved for you 🎉",
    allSecrets: "You found every secret I hid, Himani! 🏆"
  },

  /* ---------- Private photos ----------
     The photos are encrypted (tools/lock-photos.mjs) so they stay private
     even though the site is public. Himani enters the secret code on the
     very first screen, which unlocks every photo on the site. */
  photoLock: {
    // Shown on the very first screen, before anything else
    gateTitle: "A secret code opens this little universe",
    gateHint: "Only you and I know this one 💗",
    hint: "Ask me for the secret word 💌",
    wrong: "That's not it, Himani. Try again 💭",
    unlocked: "Unlocked, just for you 💖"
  },

  /* ---------- Music ----------
     Leave src empty to use the built-in soft music-box melody,
     or add your own song: src: "assets/music/our-song.mp3" */
  music: { src: "" }
};
