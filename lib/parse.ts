export type Card = {
  id: string;
  topic: string;
  title: string;
  content: string;
};

export type Section = {
  title: string;
  content: string;
};

export function parseCards(md: string, topic: string): Card[] {
  const cards: Card[] = [];
  const lines = md.split('\n');
  let currentTitle = topic;
  let buf: string[] = [];

  function flush() {
    const content = buf.join('\n').trim();
    if (content) {
      const id = `${topic}::${currentTitle}::${cards.length}`;
      cards.push({ id, topic, title: currentTitle, content });
    }
    buf = [];
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      currentTitle = line.slice(3).trim();
    } else if (line.trim() === '---') {
      flush();
    } else {
      if (line.startsWith('# ')) continue;
      buf.push(line);
    }
  }
  flush();
  return cards;
}

export function parseSections(md: string): Section[] {
  const sections: Section[] = [];
  const lines = md.split('\n');
  let currentTitle = '';
  let buf: string[] = [];

  function flush() {
    const content = buf.join('\n').trim();
    if (content) sections.push({ title: currentTitle, content });
    buf = [];
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush();
      currentTitle = line.slice(3).trim();
    } else if (line.startsWith('# ')) {
      continue;
    } else {
      buf.push(line);
    }
  }
  flush();
  return sections;
}
