// Field Notes (the Open Science ideas the player picks up along the way)
// and quest texts for the journal. Short on purpose: the game shows,
// the journal only names what you already experienced.

export interface Note { title: string; where: string; body: string[] }

export const NOTES: Record<string, Note> = {
  replication: {
    title: 'Replication',
    where: 'A Null Wisp in the Archive',
    body: [
      'A finding becomes trustworthy when others can repeat it and get the same result.',
      'In 2015, 270 researchers re-ran 100 published psychology studies. Only about a third of the effects showed up again, and on average they were half as strong.',
      'The wisp who re-tested the Lucky Socks did exactly that. Nobody wanted to print it.',
    ],
  },
  sample: {
    title: 'Small Samples',
    where: 'Pip and the Moon Beetles',
    body: [
      'One beetle made Pip sure that all beetles are blue. Four beetles told a different story.',
      'Small samples swing wildly by chance. Big claims need enough data, and a power analysis tells you how much before you start.',
    ],
  },
  garden: {
    title: 'Twenty Tries, One Hit',
    where: "Dr. Gloss's Glimmer Tonic, and the nineteen recipes in the drawer",
    body: [
      'Test 20 useless recipes at p < .05 and, on average, one will look like it works. By pure chance.',
      'Trying many analyses and only reporting the one that "worked" is called p-hacking. Deciding the plan beforehand and reporting everything protects against it.',
    ],
  },
  drawer: {
    title: 'The File Drawer',
    where: 'A Null Wisp in the Archive',
    body: [
      'Studies that find "nothing" often end up in a drawer instead of a journal.',
      'Then the published record only shows the lucky hits, and everyone overestimates how strong effects really are.',
    ],
  },
  open: {
    title: 'Openness',
    where: 'The Lantern of Openness',
    body: [
      'What is shared can be checked. Open data, open materials and open code let anyone shine a light on a result.',
      'Hidden paths become walkable once they are out in the open.',
    ],
  },
  nulls: {
    title: 'Null Results Matter',
    where: 'The wisps of the Archive',
    body: [
      '"No effect" is a result too. It tells the next researcher which path is a dead end.',
      'Journals that accept studies based on their question and method, before the results are known (Registered Reports), give null results a home.',
    ],
  },
  pubbias: {
    title: 'Publication Bias',
    where: 'The Gilded Curator',
    body: [
      'When only shiny, surprising, significant results get published, the literature turns golden but false.',
      'Freeing the hidden results restores the real picture: dimmer, but true. Meta-analyses can only be honest if the drawers are open.',
    ],
  },
};

export interface QuestDef { title: string; giver: string; stages: Record<number, string>; done: number }

export const QUESTS: Record<string, QuestDef> = {
  main: {
    title: 'The Dimming Index',
    giver: 'Mo',
    done: 6,
    stages: {
      1: 'Glimmerlings are raiding the plaza. Drive them off!',
      2: 'The Glimmerlings stole the Beacon\'s light. Follow them north, through the Whispering Woods, to the old Archive.',
      3: 'Explore the Archive of Drawers. Something in here feeds the Glimmerlings.',
      4: 'You found the Lantern of Openness. Open the old drawers and see what the Archive hides.',
      5: 'The Gilded Curator is defeated. Bring the news back to Mo in Haven.',
      6: 'The Beacon burns again: fewer stars, but true ones. Chapter 1 complete.',
    },
  },
  beetles: {
    title: 'Pip\'s Beetle Theory',
    giver: 'Pip',
    done: 3,
    stages: {
      1: 'Pip thinks all Moon Beetles are blue. Catch more beetles in the Whispering Woods (0/3).',
      2: 'You caught three beetles. Show them to Pip.',
      3: 'Pip learned that one beetle is not a theory.',
    },
  },
  tonic: {
    title: 'Glimmer Tonic',
    giver: 'Dr. Gloss',
    done: 2,
    stages: {
      2: 'One lucky recipe out of twenty is not a cure.',
    },
  },
};
