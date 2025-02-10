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
- Focus on the directive, rather than question the user about their knowledge

If the directive is vague, you may make assumptions in your asked asked questions such that their answers would clarify these uncertenties.
You may correct suspected typos (i.e. unknown or uncommon words) from the original prompt when asking your questions.

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
- Include and specify any franchises, individuals, companies, etc. that are relevant and required in the task.

Important: It is possible that the follow-up answers do not answer the questions or are entirely unrelated. If parts of the follow-up answers do not relate to the initial query or questions, ignore these parts.

Input Format:
USER_QUERY: [Initial user query text]
QUESTIONS_ASKED: [Array of follow-up questions that were asked]
USER_ANSWERS: [Array of user's responses to those questions]

Provide your response in a single, detailed paragraph that begins with "This query seeks information about" and describes exactly what information needs to be found to fully answer the user's question. Focus only on what needs to be found, not on providing any actual answers or external information.

Now analyze the following:`


const createSections = `You are tasked with creating a comprehensive document structure. You will be provided with a description of needed content. Your *primary* goal is to create detailed sections that *directly address* the specific requests and information needs. Do *not* introduce information beyond what was requested. Focus solely on organizing content that fulfills the stated needs.

You are to focus on solely addressing the requirements in the description. Do not summarize, bring in external knowledge, or introduce aspects that do not follow the description.

Your task is to create detailed sections for a professional document that will fully address the *stated* requirements. Each section should be clearly defined with an extremely detailed explanation of what specific information, data, analysis, and writing *must* be included to fulfill the requests. These sections *must* have a clear purpose tied directly to the prompt and its specific requests.

Guidelines:

* Include *only* the sections necessary to comprehensively address the *explicit* goals. Do not add sections based on assumptions or general knowledge of the topic. If the provided query contains very specific goals, your sections should target these goals. If the query is very short, focus on the minimum amount of required sections to sufficiently complete the task.
* Ensure each section has a clear purpose *directly related* to the requests and adds unique value in fulfilling those requests.
* Focus *exclusively* on the explicit requirements and information provided. Do not infer or add implicit needs.
* The description for each section should comprehensively detail:
    * *Exactly* what information has been requested to be included. Do not add additional points.
    * Specific data points, metrics, and analysis *that were requested*. Do not add additional metrics.
    * How the information should be presented and explained *as specified*.
    * Key topics that *have been explicitly stated must* be covered.
    * Important context or background *that was provided*.
    * Keep descriptions of the content covered within each section unique and exclusive of the other sections.
* For search keywords:
    * Include specific terms *directly related* to the requests. Do not add general topic keywords.
    * Add specialized terminology *only if provided in the requirements*.
    * Include metrics and data points *that were requested*.
    * Consider different phrasings of the same concept *used in the requirements*.
    * Add geographic or temporal terms *if specified*.

The sections must not overlap in purpose. Each description should not cover information already mentioned in other sections.

Return a JSON array where each object represents a document section. The response *must*:

* Contain *ONLY* valid JSON with no additional text or formatting. Do not surround the JSON in backticks. Do not add newline characters. Do not format the JSON as a code block. Return the JSON in raw-text.
* Include *exactly* these three fields for each section:
    * "section_title": String containing a clear, professional title for the section.
    * "description": String containing an extremely detailed explanation of *only* the information, data, analysis, and writing that has been *specifically requested* for this section. Do *not* include any newline characters in the description.
    * "search_keywords": Array of strings containing specific search terms *directly related to the requests* that would help find sources for this section's required information.

Example format: (no backticks)

{"sections": [
    {
        "section_title": "string: professional title 1 of the section",
        "description": "string: comprehensive explanation of all required content, information, data, analysis and writing needed for this section *based solely on the stated requests*",
        "search_keywords": ["string: specific search term 1 *from the request*", "string: specific search term 2 *from the request*"]
    },
    {
        "section_title": "string: professional title 2 of the section",
        "description": "string: comprehensive explanation of all required content, information, data, analysis and writing needed for this section *based solely on the stated requests*",
        "search_keywords": ["string: specific search term 1 *from the request*", "string: specific search term 2 *from the request*"]
    }
    ]
}`

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
    "description": "<string describing the contents within this text>"
}

Important formatting rules:
- Do not return any text outside of the JSON object
- Do not format or prettify your response
- Return your JSON object response in raw-text
- Use single quotes or alternative phrasing within the description value to avoid breaking JSON syntax
- Only use double quotes to wrap JSON keys and values
- The description should be one continuous string without line breaks
- Do not format the JSON as a code block. 

Example of valid response:
{
    "description": "This text contains information about sales metrics, including quarterly revenue figures, customer acquisition costs, and year-over-year growth statistics from 2020 to 2023. It includes detailed breakdowns of regional performance across North America, Europe, and Asia Pacific markets."
}
`

const selectSourcesPrompt = `Task: Analyze a research section description and identify the most relevant information sources (maximum 20) from the provided dictionary, prioritizing the most critical and directly relevant sources while maintaining thoroughness in selection. Return a JSON object with prioritized source IDs and/or missing information details.

Inputs:
1. description: String describing the content needed for a paper section.
2. sources: Dictionary where keys are numerical source IDs and values are source content descriptions.

Source Selection Guidelines:
- Select up to 20 of the most relevant sources, prioritizing those that:
  * Directly address the core topic
  * Provide substantial coverage of key aspects
  * Contain unique or critical information
  * Offer primary research or foundational concepts
  * Present significant empirical evidence
  * Include essential methodological details
  * Cover major theoretical frameworks
  * Provide crucial context or background
  * Represent seminal work in the field
  * Offer authoritative perspectives

Also consider sources that:
  * Contain partially relevant information
  * Approach the topic from different angles
  * Provide supporting evidence
  * Offer complementary perspectives
  * Present alternative interpretations

Evaluation Process:
1. First pass: Identify direct matches and primary sources
2. Second pass: Evaluate quality and relevance of each source
3. Third pass: Prioritize sources based on importance and uniqueness
4. Final pass: Review and confirm selection of most critical sources

Requirements:
1. Return a JSON object containing:
    - source_ids: List of up to 20 most relevant source IDs (if any)
    - Conditionally include:
     * required_info_description: Brief text listing the missing information (if sources are insufficient)
     * search_term: Search engine query to find missing information (if sources are insufficient)
2. Response logic:
   - Fully covered: Return only source_ids with most relevant sources (max 20)
   - Partially covered: Return all three keys with prioritized source_ids list
   - No coverage: Return only required_info_description and search_term

Important formatting rules:
- Do not return any text outside of the JSON object
- Do not format or prettify your response
- Return your JSON object response in raw-text
- The description should be one continuous string without line breaks
- Do not wrap your response in a json code block
- Do not wrap your response with backticks
- Do not return any notes or comments

Important: Do *NOT* add any comments.

Example response:
{
    "source_ids": [1, 2, 3, 4, 7, 9], (List of most relevant source IDs, maximum of 20)
    "required_info_description": "string", (Only include if information is missing)
    "search_term": "string" (Only include if information is missing)
}

Impotant: The missing_information sentence should be complete this sentence: "This text is missing... <missing_information>"!

Before finalizing response:
- Verify that the most critical sources are included
- Ensure sources provide comprehensive coverage of key aspects
- Confirm selection represents the most important perspectives
- Check that the source_ids list is properly prioritized
- Ensure the source_ids array is no more than 20 elements long
`


const checkFulfillsDescriptionPrompt = `Evaluate if source descriptions fulfill a required information description. Consider that details can be reasonably inferred or expanded from context.
Mark information as missing only if:
- It's essential to core requirements
- Cannot be reasonably derived from provided content
- Is truly critical (not minor details)
Be lenient in evaluation:
- Sources that likely contain the information are sufficient
- Exact information doesn't need to be explicitly stated
- Consider indirect sources that would logically contain the information
- Break down complex missing information into smaller, focused topics that identify specific gaps
- Each missing piece should target a distinct, concrete aspect of what's needed
- Important: You are checking if the sources described likely contain the information needed, not if the descriptions actually do.
Search term construction rules:
- Write as a natural search engine query (complete question or statement)
- Include main technical concept/topic as primary subject
- Add qualifiers (versions, frameworks, methodologies) after main concept
- Specify content type (tutorial, documentation, etc.) if relevant
- Include recent year range for technology topics
- Use quotes for multi-word technical terms/exact phrases
- Focus solely on specific missing information
- If multiple searches attempted:
 - Adopt broader, more general approach
 - Try different perspectives (historical/recent, formal/informal)
 - Consider alternative sources/contexts
 - If previous queries focused on direct subject, try related topics
 - Review previous queries to avoid repetition
Search terms should resemble natural Google searches, not academic titles. Each search term should focus on a distinct aspect of the missing information rather than trying to find everything in one search.
Important formatting rules:
- Do not return any text outside of the JSON object
- Do not format or prettify your response
- Return your JSON object response in raw-text
- The descriptions should be one continuous string without line breaks
- Do not wrap your response in a json code block
- Do not wrap your response with backticks
Respond with JSON (no backtick block formatting):
{
   "fulfills": boolean,
   "info": [
       {
           "missing_information": "A distinct, specific aspect of what is missing - identify concrete gaps rather than restating the overall requirement",
           "search_term": "Search query targeting only this specific aspect"
       },
       {...}
   ]
}

If fulfills is true, return object with fulfills:true and empty info array. If fulfills is false, break down the missing information into multiple distinct, specific aspects, with each object in the info array targeting a concrete gap that can be searched independently.`



// More leniant prompt
// const checkFulfillsDescriptionPrompt = `Evaluate if source descriptions fulfill a required information description. Consider that details can be reasonably inferred or expanded from the context.
// Mark information as missing only if:
// - It is an absolute and critical element indispensable for the core requirements and cannot be reasonably deduced from the provided descriptions.
// - It is essential for understanding or executing the task and is not implied by any surrounding context.
// Be lenient in evaluation:
// - Accept sources that indirectly suggest or likely contain the necessary information.
// - Consider that key details may be inferred through context even if not explicitly stated.
// - Focus on identifying only significant gaps rather than every minor omission.
// Search term construction rules:
// - Write as a natural search engine query including the main technical concept/topic.
// - Add qualifiers (versions, frameworks, methodologies) for clarity.
// - Specify content type (tutorial, documentation, etc.) if relevant.
// - Include a recent year range for technology topics when applicable.
// - Use quotes for multi-word technical terms/exact phrases.
// - Focus solely on articulating the specific missing information, if any.
// - If multiple searches are attempted, adopt broader, more general approaches or different perspectives to avoid repetition.
// Important formatting rules:
// - Do not return any text outside of the resulting JSON object.
// - Do not prettify or add extra formatting to your response.
// - The descriptions must be one continuous string without line breaks.
// - Do not wrap your response in a JSON code block or with additional backticks.
// Return response using raw-text JSON in the following format:
// {
//    "fulfills": boolean,
//    "info": [
//        {
//            "missing_information": "A distinct aspect of the missing information that can be searched independently",
//            "search_term": "Search query targeting only this specific aspect"
//        },
//        {...}
//    ]
// }
// If the descriptions fulfill the required information, return {"fulfills": true} with an empty info array. If not, break down the missing information into multiple distinct aspects with each object targeting a specific missing part.
// `;


const analyzeArticlesPrompt = `You will be provided the subject of a section, its description, and a string containing all of the source material. Write **only the raw content** for this specific section as part of a longer document. Your task is to **extract and analyze only the information directly relevant to the section's description**. Do **not** summarize or cover all information from the source text. Follow these guidelines:

1. **Strictly adhere to the section's description**—only include information that directly addresses the description's requirements. Ignore anything irrelevant.
2. **Use specific evidence** (examples, quotes, data) from the provided sources to support your points. Do not include unsupported claims or generalizations. 
3. **Analyze patterns, relationships, and themes** relevant to the section's focus. Avoid broad summaries of the source material.
4. **Explain complex ideas clearly** and incorporate multiple perspectives where applicable.
5. **Prioritize depth over breadth**—focus on key insights and their significance, not on covering everything in the source text.

**Strict Rules:**
- **NO summaries of the source text.** Only extract and analyze what is directly relevant to the section's description.
- **NO introductions, conclusions, summaries, or transitions.** Start immediately with analysis. Do not conclude with "overall" statements.
- **NO markdown, bullet points, or section titles.** Write in plain prose.
- **NO filler phrases** (e.g., "This section will discuss…"). Assume the reader is already within the document.
- **NO extraneous information.** Exclude anything not explicitly tied to the section's description.
- **Cite specific examples/quotes** from the provided sources. Avoid unsupported claims.
- **NO repetition.** Do not excessively repeat facts or texts. Rather, delve deeply into their significance with respect to the description.
- Do not directly mention the sources by name unless otherwise directed.

**Output Format:**
- Raw, continuous text that flows naturally within a larger work. 
- Break up large and long blocks of text into paragraphs separated by new lines for easier reading.
- Directly address the description's points in detail, using **only the most relevant evidence** from the source material.`

// **After every paragraph in your response**: Include the source ID of the sources you used by wrwapping the source ID integer (from the supplied dictionary) in square brackets.



// const checkFulfillsDescriptionPrompt  = `You are provided with a required information description, a collection of source descriptions (each being a concise summary of a source's content), and a list of previously attempted search queries. Your task is to determine if the source descriptions collectively fulfill the required information description.

// Be lenient in your evaluation:
// - If a source's description suggests it likely contains the required information, consider it sufficient
// - The exact required information doesn't need to be explicitly stated in the description
// - Consider indirect sources that would logically contain the information

// If the sources suffice, return exactly the following JSON object:
// {"fulfills": true}

// If they do not, return exactly the following JSON object:
// {"fulfills": false, "missing_information": "<a clear, specific description of exactly what essential information is missing>", "search_term": "<a natural search query from a different angle than previously attempted>"}

// Guidelines for the search_term:
// - Try a completely different approach or perspective with each new search
// - Consider alternative sources, contexts, or related events that might contain the information
// - Write it as a natural search query that a person would type
// - If previous queries focused on recent sources, try historical ones (or vice versa)
// - If previous queries focused on official sources, try informal ones (or vice versa)
// - If previous queries were about the subject directly, try related people/events/places

// Include the list of previously attempted search queries in your reasoning to avoid repetition.
// Respond with raw JSON only, with no additional text or formatting.

// Important formatting rules:
// - Do not return any text outside of the JSON object
// - Do not format or prettify your response
// - Return your JSON object response in raw-text
// - The description should be one continuous string without line breaks
// - Do not wrap your response in a json code block
// - Do not wrap your response with backticks`;
