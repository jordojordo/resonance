export function splitCommand(command: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: "'" | '"' | null = null;
  let inArg = false;

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index];

    if (!quote) {
      if (/\s/.test(char)) {
        if (inArg) {
          args.push(current);
          current = '';
          inArg = false;
        }
        continue;
      }

      if (char === "'" || char === '"') {
        quote = char;
        inArg = true;
        continue;
      }

      if (char === '\\') {
        const nextIndex = index + 1;

        if (nextIndex < command.length) {
          current += command[nextIndex];
          index = nextIndex;
          inArg = true;
          continue;
        }

        current += char;
        inArg = true;
        continue;
      }

      current += char;
      inArg = true;
      continue;
    }

    if (char === quote) {
      quote = null;
      inArg = true;
      continue;
    }

    if (quote === '"' && char === '\\') {
      const nextIndex = index + 1;

      if (nextIndex < command.length) {
        current += command[nextIndex];
        index = nextIndex;
        inArg = true;
        continue;
      }

      current += char;
      inArg = true;
      continue;
    }

    current += char;
    inArg = true;
  }

  if (quote) {
    throw new Error(`Unterminated quote in command: ${ command }`);
  }

  if (inArg) {
    args.push(current);
  }

  return args;
}
