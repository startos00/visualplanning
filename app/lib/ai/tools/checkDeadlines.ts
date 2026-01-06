import { GrimpoNode } from "@/app/lib/graph";

export interface DeadlineTask {
  id: string;
  label: string;
  deadline: string;
  confidence: number;
}

export interface DeadlineResult {
  overdue: DeadlineTask[];
  upcoming: DeadlineTask[];
  today: DeadlineTask[];
  tomorrow: DeadlineTask[];
  summary: string;
}

export async function checkDeadlines(nodes: GrimpoNode[], userToday?: string): Promise<DeadlineResult> {
  const now = userToday ? new Date(userToday) : new Date();
  const todayStr = now.toISOString().split("T")[0];
  
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0];
  
  console.log(`[checkDeadlines] Reference 'today' is: ${todayStr}, 'tomorrow' is: ${tomorrowStr} (Source: ${userToday ? 'Client' : 'Server'})`);
  
  const overdue: DeadlineTask[] = [];
  const upcoming: DeadlineTask[] = [];
  const today: DeadlineTask[] = [];
  const tomorrow: DeadlineTask[] = [];

  // Filter to only check tactical cards
  const tacticalNodes = nodes.filter((node) => node.type === "tactical");
  
  console.log(`[checkDeadlines] Scanning ${tacticalNodes.length} tactical card(s) out of ${nodes.length} total node(s)`);

  // Helper for implicit date parsing
  const parseImplicitDate = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    
    // 1. Look for YYYY-MM-DD (ISO format)
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];

    // 2. Look for DD/MM/YYYY or DD-MM-YYYY (4-digit year)
    const dmy4Match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy4Match) {
      const day = dmy4Match[1].padStart(2, "0");
      const month = dmy4Match[2].padStart(2, "0");
      const year = dmy4Match[3];
      return `${year}-${month}-${day}`;
    }

    // 3. Look for DD/MM/YY or DD-MM-YY (2-digit year)
    const dmy2Match = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/);
    if (dmy2Match) {
      const day = dmy2Match[1].padStart(2, "0");
      const month = dmy2Match[2].padStart(2, "0");
      const year2Digit = parseInt(dmy2Match[3], 10);
      // Convert 2-digit year to 4-digit year
      // Assume years 00-40 are 2000-2040, years 41-99 are 1941-1999
      const year = year2Digit <= 40 ? 2000 + year2Digit : 1900 + year2Digit;
      return `${year}-${month}-${day}`;
    }

    // 4. Look for DD/MM or DD-MM (assume current year)
    const dmMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?![\/\-]\d)/);
    if (dmMatch) {
      const day = dmMatch[1].padStart(2, "0");
      const month = dmMatch[2].padStart(2, "0");
      return `${now.getFullYear()}-${month}-${day}`;
    }

    // 5. Month Names (e.g., "Jan 6", "6 January")
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    for (let i = 0; i < months.length; i++) {
      const monthIndex = (i + 1).toString().padStart(2, "0");
      const monthName = months[i];
      
      // Match "Jan 6" or "6 Jan"
      const monthRegex = new RegExp(`(\\b${monthName}\\w*\\s+(\\d{1,2}))|(\\b(\\d{1,2})\\s+${monthName}\\w*)`, 'i');
      const match = text.match(monthRegex);
      if (match) {
        const day = (match[2] || match[4]).padStart(2, "0");
        return `${now.getFullYear()}-${monthIndex}-${day}`;
      }
    }

    // 6. Next [Weekday]
    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < weekdays.length; i++) {
      if (lowerText.includes(`next ${weekdays[i]}`)) {
        const targetDay = i;
        const currentDay = now.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7; // Next week
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysUntil);
        return targetDate.toISOString().split("T")[0];
      }
    }

    // 7. "Today" or "Tomorrow"
    if (lowerText.includes("today")) return todayStr;
    if (lowerText.includes("tomorrow")) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    }

    return null;
  };

  for (const node of tacticalNodes) {
    let deadline: string | null = null;
    let confidence = 0;

    // 1. Explicit check
    if (node.data.deadline) {
      deadline = node.data.deadline;
      confidence = 1.0;
    } 
    // 2. Implicit check in title/notes
    else {
      const titleDate = parseImplicitDate(node.data.title || "");
      if (titleDate) {
        deadline = titleDate;
        confidence = 0.8;
      } else {
        const notesDate = parseImplicitDate(node.data.notes || "");
        if (notesDate) {
          deadline = notesDate;
          confidence = 0.6;
        }
      }
    }

    if (deadline) {
      const task: DeadlineTask = {
        id: node.id,
        label: node.data.title || "Untitled Task",
        deadline,
        confidence,
      };

      console.log(`[checkDeadlines] Found deadline for "${task.label}": ${deadline} (confidence: ${confidence})`);

      if (deadline < todayStr) {
        overdue.push(task);
      } else if (deadline === todayStr) {
        today.push(task);
        upcoming.push(task); // Today is also upcoming in a broad sense
      } else if (deadline === tomorrowStr) {
        tomorrow.push(task);
        upcoming.push(task);
      } else {
        upcoming.push(task);
      }
    }
  }

  return {
    overdue,
    upcoming,
    today,
    tomorrow,
    summary: `I scanned ${tacticalNodes.length} tactical card${tacticalNodes.length !== 1 ? 's' : ''} and found ${overdue.length} overdue task${overdue.length !== 1 ? 's' : ''}, ${today.length} due today, ${tomorrow.length} due tomorrow, and ${upcoming.length - today.length - tomorrow.length} more coming up soon!`,
  };
}

