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
  summary: string;
}

export async function checkDeadlines(nodes: GrimpoNode[]): Promise<DeadlineResult> {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  
  const overdue: DeadlineTask[] = [];
  const upcoming: DeadlineTask[] = [];
  const today: DeadlineTask[] = [];

  // Helper for implicit date parsing
  const parseImplicitDate = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    
    // 1. Look for YYYY-MM-DD
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];

    // 2. Look for DD/MM or DD-MM (assume current year)
    const dmMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if (dmMatch) {
      const day = dmMatch[1].padStart(2, "0");
      const month = dmMatch[2].padStart(2, "0");
      return `${now.getFullYear()}-${month}-${day}`;
    }

    // 3. Next [Weekday]
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

    // 4. "Today" or "Tomorrow"
    if (lowerText.includes("today")) return todayStr;
    if (lowerText.includes("tomorrow")) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return tomorrow.toISOString().split("T")[0];
    }

    return null;
  };

  for (const node of nodes) {
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

      if (deadline < todayStr) {
        overdue.push(task);
      } else if (deadline === todayStr) {
        today.push(task);
        upcoming.push(task); // Today is also upcoming in a broad sense
      } else {
        upcoming.push(task);
      }
    }
  }

  return {
    overdue,
    upcoming,
    today,
    summary: `I found ${overdue.length} overdue tasks, ${today.length} due today, and ${upcoming.length - today.length} more coming up soon!`,
  };
}

