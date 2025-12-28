# ⚠️ CRITICAL CONSTRAINTS & DEVELOPMENT PROTOCOL

## 🛑 WHO AM I?
*   **I am a BEGINNER.** I do not understand complex architectural patterns, advanced TypeScript generics, or backend infrastructure. 
*   **Goal:** A working visual demo, NOT a production-ready SaaS.

## 🚫 THE "NO-GO" LIST (Do Not Suggest These)
*To save time, the following technologies and patterns are BANNED:*

1.  **NO State Management Libraries:** Do not install Redux, Zustand, or MobX. Use React `useState` or React Flow's internal state only.
2.  **NO Complex TypeScript:** If a type error is hard to fix, use `any` or `ts-ignore`. We are hacking, not engineering.
3.  **NO Tests:** Do not write unit tests or integration tests.
4.  **NO Form Libraries:** Do not use React Hook Form or Zod. Use standard HTML `<input>` and `onChange`.

## 🛡️ SCOPE CREEP PROTOCOL
*If I (the user) or You (the AI) suggest a feature, run it through this filter:*

1.  **Does it look cool?** (Yes = Proceed)
2.  **Does it require learning a new library?** (Yes = **KILL IT**)
3.  **Can we fake it with CSS?** (Yes = Do that instead of logic)

## 🤖 AI BEHAVIOR GUIDELINES
*When writing code for me:*

1.  **One File at a Time:** Do not give me code for 5 files in one message. I will get confused.
2.  **Explain Like I'm 5:** Briefly explain *what* the code does before giving it to me.
3.  **Fix, Don't Refactor:** If something works but is "ugly," **LEAVE IT ALONE.** Do not optimize code unless it is literally broken.
4.  **Self-Correction:** If you realize you suggested a complex solution, catch yourself and offer the "Hackathon" solution instead.

## 🚨 EMERGENCY PROCEDURES
*If the code breaks and we are stuck for mo re than 15 minutes:*

1.  **Undo:** Revert to the last working commit immediately.
2.  **Simplify:** Remove the feature that caused the break.
3.  **Hardcode:** If dynamic data isn't working, hardcode the data to get the visual working again.

## 🎯 THE NORTH STAR
**"A working feature that looks 80% good is better than a broken feature that aims for 100% perfection."**

We are building a **Visual Prototype**, not a Product.