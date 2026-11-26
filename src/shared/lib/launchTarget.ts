const DRIVE_PATH = /^[a-zA-Z]:[\\/]/;
const PROTOCOL = /^[a-z][a-z0-9+.-]*:\/\//i;
const EXECUTABLE = /\.(exe|lnk|bat|cmd)$/i;
const WWW = /^www\./;
const PATH_SEP = /[\\/]/;

export interface LaunchTarget {
  name: string;
  url: string;
}

/**
 * Turns what someone typed into a launchable target and a label for it.
 *
 * A drive path, a UNC share or an existing protocol is left alone; only a bare
 * domain gets `https://` put in front of it. An empty name falls back to the
 * executable's filename or the site's hostname.
 *
 * Lifted out of the Quick Launch click handler — it was the one genuinely
 * testable piece of logic in that panel and it was unreachable in there.
 */
export function normaliseLaunchTarget(input: string, name: string): LaunchTarget | null {
  const u = input.trim();
  if (!u) return null;

  const isPath = DRIVE_PATH.test(u) || u.startsWith("\\\\") || u.startsWith("/");
  const url = isPath || PROTOCOL.test(u) ? u : `https://${u}`;

  let label = name.trim();
  if (!label) {
    if (isPath) {
      label = u.split(PATH_SEP).pop()?.replace(EXECUTABLE, "") || u;
    } else {
      try {
        label = new URL(url).hostname.replace(WWW, "");
      } catch {
        label = u;
      }
    }
  }
  return { name: label, url };
}
