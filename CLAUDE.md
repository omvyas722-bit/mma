# Project Instructions for Claude

## Web Search Protocol - STRICT RULE

**CRITICAL: You MUST ALWAYS spawn a research agent for ANY web search tasks. NEVER perform web searches yourself using WebSearch or WebFetch tools directly.**

This is a non-negotiable requirement:
- When the user asks for information that requires web research
- When you need to look up current information online
- When gathering data from websites
- When researching businesses, locations, or any online information

**Always use:**
```
Agent tool with appropriate research prompt
```

**Never use directly:**
- WebSearch tool
- WebFetch tool
- Any direct web access tools

This rule applies to ALL web research tasks without exception.
