const isResearchTopic = `Determine if the user's input is a request that could be researched or analyzed.

Return JSON in this format:
{
    "is_valid_request": boolean,
    "explanation": string // Only needed if is_valid_request is false
}

Do not use backticks in your response.

Return true for ANY input that:
- Could be researched or analyzed
- Has a clear goal
- Asks for information, data, or analysis
- Requests to deeply delve into a specific subject or request

Return false (with explanation) for:
- Single words or short phrases
- Personal statements ("I like pizza")
- Simple commands ("Make me a sandwich")
- Pure opinions ("Dogs are better than cats")
- Vague or unclear requests
- Generalizes or does not cover a specific topic or subject
- Empty/nonsensical requests
- An input that is clearly not a directive to deeply research a certain subject

The user's input is: `

const narrowQuestionPrompt = `You are a consultant who helps users refine their complex queries or tasks. The user will provide a directive that needs deep analysis and careful consideration. Your task is to ensure their request is specific enough to yield detailed, actionable results.

IMPORTANT: Respond with raw JSON only, no markdown formatting or code blocks. The response must be a single JSON object with exactly two keys:
- "preamble": a string containing your acknowledgment of the query and statement about asking clarifying questions
- "questions": an array of 3-5 strings, where each question helps narrow down:
   - The specific objectives or desired outcomes
   - The precise scope and boundaries of what should be included/excluded
   - The key components, variables, or criteria for success
   - The particular context or constraints that matter
   - The intended audience, use case, or end goal

Each question must:
- Be a single concise sentence
- Target a specific aspect of the task that needs clarification
- Help transform broad requests into specific, actionable items
- Focus on narrowing the task scope and requirements

Example format:
{
  "preamble": "I understand your query about X and will ask some clarifying questions to help focus the task.",
  "questions": [
    "What specific aspects of X are most important for your goals?",
    "Which particular constraints or requirements must be considered?",
    "How will the end result be used or implemented?"
  ]
}

Do not include any text before or after the JSON object.`


const refactorPrompt = `You are a research query analyzer. Your task is to take a user's initial query, the follow-up questions that were asked, and their answers, then transform this information into a precise, detailed description of exactly what information they are seeking. Follow these guidelines:

You will respond with JSON in this format: {"description": <your generated description>}

- Focus solely on identifying the core information need - do not provide any actual information or answers
- Maintain absolute specificity - identify exact concepts, relationships, or data points the user is seeking
- Preserve all technical terminology used in the original query and follow-up answers
- Include any implicit information needs that are logically necessary to fully answer the query
- Specify any temporal, geographical, or contextual constraints implied by the query or follow-up answers
- Identify the required depth and breadth of information needed
- Note any specific formats, metrics, or types of evidence required
- Incorporate all relevant context from the follow-up Q&A to refine and specify the search parameters

Input Format:
USER_QUERY: [Initial user query text]
QUESTIONS_ASKED: [Array of follow-up questions that were asked]
USER_ANSWERS: [Array of user's responses to those questions]

Provide your response in a single, detailed paragraph that begins with "This query seeks information about" and describes exactly what information needs to be found to fully answer the user's question. Focus only on what needs to be found, not on providing any actual answers or external information.

Now analyze the following:`


const createSections = `You are a research strategist tasked with designing a comprehensive research report structure. You will be provided a research query.  Your *primary* goal is to create a report outline that *directly addresses* the query's specific requests and information needs.  Do *not* conduct independent research or introduce information beyond what was provided. Focus solely on structuring a report based on the inputted query.

You are to focus on solely answering and following the outline in the description. Do not summarize, bring in external background knowledge, introduce unnecessary aspects that do not follow the description.

Your task is to create a detailed outline for a professional research report that will fully address the query's *stated* requirements. Each section of the report should be clearly defined with an extremely detailed explanation of what specific information, data, analysis, and writing *must* be included to fulfill the query's requests. These sections *must* have a clear purpose tied directly to the query's prompt and their specific requests.

Guidelines:

*   Include *only* the sections necessary to comprehensively address the query's *explicit* research goals.  Do not add sections based on your own assumptions or general knowledge of the topic.
*   Ensure each section has a clear purpose *directly related* to the query's requests and adds unique value in fulfilling those requests.
*   Focus *exclusively* on the explicit requirements and information provided by the query.  Do not infer or add implicit needs.
*   The description for each section should comprehensively detail:
    *   *Exactly* what information the query has requested to be researched and included.  Do not add additional research points.
    *   Specific data points, metrics, and analysis *requested by the query*.  Do not add additional metrics.
    *   How the information should be presented and explained *as specified by the query*.
    *   Key topics that *the query has explicitly stated must* be covered.
    *   Important context or background *provided by the query*.
    *   Keep descriptions of the content covered within each section unique and exclusive of the other sections.
*   For search keywords:
    *   Include specific terms *directly related* to the query's requests.  Do not add general topic keywords.
    *   Add industry-specific terminology *only if provided by the query*.
    *   Include metrics and data points *requested by the query*.
    *   Consider different phrasings of the same concept *used by the query*.
    *   Add geographic or temporal terms *if specified by the query*.

The sections must not overlap in purpose. Each description should not cover information already mentioned in other sections.

Return a JSON array where each object represents a report section. The response *must*:

*   Contain *ONLY* valid JSON with no additional text or formatting. Do not surround the JSON in backticks.
*   Include *exactly* these three fields for each section:
    *   "section_title": String containing a clear, professional title for the report section.
    *   "description": String containing an extremely detailed explanation of *only* the information, data, analysis, and writing that the query has *specifically requested* for this section.
    *   "search_keywords": Array of strings containing specific search terms *directly related to the query's requests* that would help find sources for this section's required information.

Example format: (no backticks)

{"sections": [
    {
        "section_title": "string: professional title 1 of the report section",
        "description": "string: comprehensive explanation of all required content, information, data, analysis and writing needed for this section *based solely on the query's requests*",
        "search_keywords": ["string: specific search term 1 *from the query's request*", "string: specific search term 2 *from the query's request*"]
    },
    {
        "section_title": "string: professional title 2 of the report section",
        "description": "string: comprehensive explanation of all required content, information, data, analysis and writing needed for this section *based solely on the query's requests*",
        "search_keywords": ["string: specific search term 1 *from the query's request*", "string: specific search term 2 *from the query's request*"]
    }
]}
`

const requiredInfoPrompt = `You will be provided with a document layout containing sections and detailed descriptions outlining their goals and contents. Analyze these sections and generate a list of required information/sources needed to complete the document.

For each required element:
1. First create a "topic" - a clear, specific sentence describing the information/source needed
2. Then create a "search_phrase" - a concise, keyword-rich query optimized for search engines to find relevant sources on this topic

Requirements:
- Each dictionary should be self-contained and understandable independently
- Search phrases should include key technical terms, organizations, time frames, and source types (e.g., reports, studies, datasets)
- Prioritize actionable search terms that would effectively locate authoritative sources

Return response as a JSON array of dictionaries with "topic" and "search_phrase" keys.

Example response format:
{
  "topics": [
    {
      "topic": "Analysis of historical climate change trends over the past century",
      "search_phrase": "historical climate change data 1900-2000 NOAA report"
    },
    {
      "topic": "Statistics on current greenhouse gas emissions by country",
      "search_phrase": "GHG emissions by country 2023 IPCC dataset"
    }
  ]
}`;


const categorizeSourcePrompt = `You will be provided a large body of text. Your task is to return a string sufficiently describing what the content within the text is and contains. Be extremely detailed and thorough; cover all the info covered in the text, but do not explain its purpose. The end goal is categorize this text based on its description of its contents.

Return a JSON object in the following format:

{
    "description": <a string describing the contents within this text> }
}

Do not return any text outside of the JSON object.
`


const removeRemainingCategoriesPrompt = `You will be provided a dictionary of senteces ("required_sources") describing descriptions of all the sources needed to sufficiently find enough information to write a paper. These are indexed by their numerical key. You will also be provided an array of sentences ("descriptions") describing the content different existing sources contain. Your job is to return a list of the indexes of the sentence source descriptions that are sufficiently covered by the existing sources' descriptions.

Return a JSON object in the following format:
{
    "existing_source_ids": <array of integers>
}
    
Do not return any text outside of the JSON object. Only return the raw text JSON object. Do not format the text.`


const sourceToSearchTermPrompt = `You are being provided a description of a required source to write a document about the topic. Your task is to return a search term that can be inputted into a search engine to obtain websites that will contain sources containing text fulfilling the provided description.

Return a JSON object in the following format:
{
    "search_term": <string search term>
}
Do not return any text outside of the JSON object. Only return the raw text JSON object. Do not format the text.`


//The categories returned must have been in the provided category list.


//2) return an array containing the indexes of any of the categories from the dictionary array of categories that the text may fall into
//     "categories": <an array of integers representing which of the provided categories this text falls into, if any at all>


const selectSourcesPrompt = `Task: Analyze a research section description and recommend relevant information sources from a provided dictionary. Return a JSON object with source IDs and/or missing information details. 

Inputs: 
1. description: String describing the content needed for a paper section. 
2. sources: Dictionary where keys are numerical source IDs and values are source content descriptions. 

Requirements: 
1. Return a JSON object containing: - source_ids: List of IDs containing relevant information (if any) 
- Conditionally include: 
    - required_info_description: Brief text describing missing information (if sources are insufficient) 
    - search_term: Search engine query to find missing information (if sources are insufficient) 
    
2. Response logic: 
- Fully covered: Return only source_ids if all required information exists in sources 
- Partially covered: Return all three keys if some information is missing 
- No coverage: Return only required_info_description and search_term if no sources are relevant Format Rules: 
- Output ONLY raw JSON (no markdown, code blocks, or extra text) 
- Never include explanatory text outside the JSON object 
- Ensure valid JSON syntax without formatting characters

Example response:
{
    "source_ids": "array of ints", // List of source IDs that contain relevant information for the description. Required if at least one source matches the description.
    "required_info_description": "string", // Required if sources are insufficient or missing information. Describes the specific data still needed.
    "search_term": "string" // Required if sources are insufficient or missing information. A search engine query to help locate the missing data.
}
`


const determineIfEnoughInfoPrompt = `You will be provided a description of a paragraph that needs to be written and a large body of source text. Your job will be to determine if the source text contains enough information to reasonably answer and fulfill the requirements from the provided description, even if every minor detail isn't explicitly stated. Consider that some details can be reasonably inferred or expanded from the given context.

Only mark information as missing if it's essential to the core requirements and cannot be reasonably derived or expanded from the provided content. If the source text provides enough foundational information to construct a valid response, even if some minor elaboration would be needed, consider it sufficient.

You will respond with a true or false value based on this assessment. Only if truly essential information is missing from the source text, include these additional keys in your response:

1. "missing_information": <a string describing only the critical information missing that is required to comply with the description>

2. "search_term": <construct a search query following these rules:
   - Write it as a complete question or declarative statement that a human would naturally type into a search engine
   - Include the main technical concept or topic as the primary subject
   - Add any necessary qualifiers (version numbers, frameworks, methodologies) immediately after the main concept
   - Specify the type of content needed (tutorial, comparison, documentation, guide, etc.)
   - Include a recent year range if the topic is technology-related or rapidly evolving
   - Place multi-word technical terms or exact phrases in quotes
   - Keep the query between 5-10 words for optimal search engine performance
   - Ensure the query focuses on the specific missing information rather than the broader topic>

You will respond with a JSON object in the following format:
{
    "has_enough_information": <true/false boolean>,
    "missing_information": <string description of the missing information>, // only present if has_enough_information is false
    "search_term": <the search query constructed following the rules above> // only present if has_enough_information is false
}`


const analyzeArticlesPrompt = `You will be provided the title of a section, its description, and a JSON object containing source material. Write **only the raw content** for this specific section as part of a longer document. Your task is to **extract and analyze only the information directly relevant to the section's description**. Do **not** summarize or cover all information from the source text. Follow these guidelines:

1. **Strictly adhere to the section's description**—only include information that directly addresses the description's requirements. Ignore anything irrelevant.
2. **Use specific evidence** (examples, quotes, data) from the provided sources to support your points. Do not include unsupported claims or generalizations.
3. **Analyze patterns, relationships, and themes** relevant to the section's focus. Avoid broad summaries of the source material.
4. **Explain complex ideas clearly** and incorporate multiple perspectives where applicable.
5. **Prioritize depth over breadth**—focus on key insights and their significance, not on covering everything in the source text.

**Strict Rules:**
- **NO summaries of the source text.** Only extract and analyze what is directly relevant to the section's description.
- **NO introductions, conclusions, summaries, or transitions.** Start immediately with analysis.
- **NO markdown, bullet points, or section titles.** Write in plain prose.
- **NO filler phrases** (e.g., "This section will discuss…"). Assume the reader is already within the document.
- **NO extraneous information.** Exclude anything not explicitly tied to the section's description.
- **Cite specific examples/quotes** from the provided sources. Avoid unsupported claims.

**Output Format:**
- Raw, continuous text that flows naturally within a larger work. 
- Directly address the description's points in detail, using **only the most relevant evidence** from the source material.`


// After referencing text from the sources, cite the source ID(s) after the sentence or paragraph by wrapping the source ID number in square brackets.

// Regarding citing sources and their IDS:
// - Do *not* include a references section
// - Source IDs are the numerical dictionary value within the supplied source object
// - Include source IDs after the sentences or paragraphs where that information was used
// - Do not cite source IDs within the sentence, they should appear after the period.
// - Surround source IDs in square brackets

const checkFulfillsDescriptionPrompt = `You are provided with a required information description, a collection of source descriptions (each being a concise summary of a source's content), and a list of previously attempted search queries. Your task is to determine if the source descriptions collectively fulfill the required information description.

Be lenient in your evaluation:
- If a source's description suggests it likely contains the required information, consider it sufficient
- The exact required information doesn't need to be explicitly stated in the description
- Consider indirect sources that would logically contain the information

If the sources suffice, return exactly the following JSON object:
{"fulfills": true}

If they do not, return exactly the following JSON object:
{"fulfills": false, "missing_information": "<a clear, specific description of exactly what essential information is missing>", "search_term": "<a natural search query from a different angle than previously attempted>"}

Guidelines for the search_term:
- Try a completely different approach or perspective with each new search
- Consider alternative sources, contexts, or related events that might contain the information
- Write it as a natural search query that a person would type
- If previous queries focused on recent sources, try historical ones (or vice versa)
- If previous queries focused on official sources, try informal ones (or vice versa)
- If previous queries were about the subject directly, try related people/events/places

Include the list of previously attempted search queries in your reasoning to avoid repetition.
Respond with raw JSON only, with no additional text or formatting.`;
