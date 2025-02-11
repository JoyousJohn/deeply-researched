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

const refactorPrompt = `You are a research query analyzer. Your task is to analyze a user's initial query, follow-up questions, and their answers, then provide three key pieces of information:
1. A precise, detailed description of the information being sought
2. Specific formatting requirements for the response mentioned in or derived from the input information
3. Required content elements that must be included in the response

Your response must be JSON in this format:
{
    "query": <string describing the core information needs>,
    "formatting_requirements": <string containing specific formatting requirements>,
    "content_requirements": <string listing mandatory content elements>
}

Ensure your JSON is valid and well-constructed.

For the query analysis:
- Focus solely on identifying the core information need
- Maintain absolute specificity - identify exact concepts, relationships, or data points
- Preserve all technical terminology from the original query and follow-up answers
- Include implicit information needs that are logically necessary
- Specify temporal, geographical, or contextual constraints
- Incorporate all relevant context from follow-up Q&A
- Include any franchises, individuals, companies, etc. that are relevant
- Begin with "This query seeks information about"
- Do NOT include any formatting requirements in this section

For the formatting requirements, specify (if mentioned):
- Required depth and breadth of information
- Any specific formats (tables, lists, diagrams, etc.)
- Required metrics or measurements
- Types of evidence or sources needed
- Structure of the response (paragraphs, sections, etc.)
- Level of technical detail required
- Any specific citation formats
- Requirements for examples or illustrations
- Whether comparisons or analyses are needed
- Any specific organizational requirements
- Do not specify a citation format unless otherwise mentioned

For the required content elements:
- List all specifically requested topics that must be covered
- Include any mandatory examples, case studies, or scenarios
- Specify required data points or metrics that must be included
- List any specific theories, methods, or approaches that must be discussed
- Include any historical context or background that must be provided
- Specify any required definitions or explanations
- List any mandatory comparisons or contrasts
- Include any required perspectives or viewpoints
- Specify any necessary calculations or analyses
- List any required recommendations or solutions

Note: If parts of the follow-up answers do not relate to the initial query or questions, ignore these parts.

*Important* Notes: 
- Formatting requirements must deal solely with textual formatting and not mention required content
- Required content should be specific elements that must appear in the response, not formatting instructions
- The query should focus on the core information need without listing specific required elements

Input Format:
USER_QUERY: [Initial user query text]
QUESTIONS_ASKED: [Array of follow-up questions that were asked]
USER_ANSWERS: [Array of user's responses to those questions]
`

const createSections = `You are tasked with creating a comprehensive document structure. You will be provided with three inputs: 1) a detailed query describing the core information needs, 2) specific formatting requirements, and 3) required content elements. Your task is to create detailed sections that address these requirements while adhering to the specified formatting.

You are to focus on incorporating all three inputs into an organized structure. Do not introduce information beyond what was specified in these inputs. Focus solely on organizing content that fulfills the stated needs.

Your task is to create detailed sections for a professional document that will fully address all requirements from the three inputs. Each section should be clearly defined with an extremely detailed explanation of what specific information, data, analysis, and writing must be included to fulfill the requests. These sections must have a clear purpose tied directly to the three inputs.

Guidelines:

* Include only the sections necessary to comprehensively address the explicit goals from all three inputs. Do not add sections based on assumptions or general knowledge of the topic.
* Ensure each section has a clear purpose directly related to the query, follows the formatting requirements, and incorporates the required content elements.
* Focus exclusively on organizing and structuring the information specified in the three inputs. Do not infer or add implicit needs.
* The description for each section should comprehensively detail:
    * Exactly what information from the query should be included
    * How to implement the specified formatting requirements
    * How to incorporate all required content elements
    * How the information should be presented and structured
    * Key topics that must be covered based on all inputs
    * Keep descriptions of the content covered within each section unique and exclusive of the other sections.
* For search keywords:
    * Include specific terms from all three inputs
    * Add specialized terminology from the requirements
    * Include metrics and data points specified
    * Consider different phrasings of key concepts from all inputs
    * Add geographic or temporal terms if specified

The sections must not overlap in purpose. Each description should not cover information already mentioned in other sections.

Return a JSON array where each object represents a document section. The response must:

* Contain ONLY valid JSON with no additional text or formatting. Do not surround the JSON in backticks. Do not add newline characters. Do not format the JSON as a code block. Return the JSON in raw-text.
* Include exactly these three fields for each section:
    * "section_title": String containing a clear, professional title for the section.
    * "description": String containing an extremely detailed explanation of how to implement all requirements from the three inputs for this section. Do not include any newline characters in the description. The description should start with "A... "
    * "search_keywords": Array of strings containing specific search terms from all three inputs that would help find sources for this section's required information.

Input Format:
QUERY: [String describing the core information needs]
FORMATTING_REQUIREMENTS: [String containing specific formatting requirements]
CONTENT_REQUIREMENTS: [String listing mandatory content elements]

Example format: (no backticks)

{"sections": [
        {
            "section_title": "string: professional title 1 of the section",
            "description": "string: comprehensive explanation of how to implement all requirements from the three inputs for this section",
            "search_keywords": ["string: specific search term 1 from the inputs", "string: specific search term 2 from the inputs"]
        },
        {
            "section_title": "string: professional title 2 of the section",
            "description": "string: comprehensive explanation of how to implement all requirements from the three inputs for this section",
            "search_keywords": ["string: specific search term 1 from the inputs", "string: specific search term 2 from the inputs"]
        }
    ]
}
    
`

const requiredInfoPrompt = `You will be provided with a document layout containing sections and detailed descriptions outlining their goals and contents. Analyze these sections and generate a list of required information/sources needed to complete the document.

For each required element:
1. First create a "topic" - a clear, specific sentence describing the information/source needed
2. Then create a "search_phrase" - a concise, keyword-rich query optimized for search engines to find relevant sources on this topic

Requirements:
- Each dictionary should be self-contained and understandable independently
- Search phrases should include key technical terms, organizations, time frames, and source types (e.g., reports, studies, datasets)
- Prioritize actionable search terms that would effectively locate authoritative sources
- Break down your response into the minimum amount of topics to fully complete the task and find all information.

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

const selectOnlySourcesPrompt = `Task: Analyze a research section description and identify the most relevant information sources (maximum 20) from the provided dictionary, prioritizing the most critical and directly relevant sources.

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

Evaluation Process:
1. First pass: Identify direct matches and primary sources
2. Second pass: Evaluate quality and relevance of each source
3. Third pass: Prioritize sources based on importance and uniqueness
4. Final pass: Review and confirm selection of most critical sources

Requirements:
- Return a JSON object containing only the source_ids key
- The source_ids value should be an array of up to 20 numerical IDs
- IDs should be ordered by relevance/importance

Important formatting rules:
- Do not return any text outside of the JSON object
- Do not format or prettify your response
- Return your JSON object response in raw-text
- Do not wrap your response in a json code block
- Do not wrap your response with backticks
- Do not return any notes or comments

Example response:
{"source_ids":[1,2,3,4,7,9]}

Before finalizing response:
- Verify that the most critical sources are included
- Ensure sources provide comprehensive coverage of key aspects
- Confirm selection represents the most important perspectives
- Check that the source_ids list is properly prioritized
- Ensure the source_ids array is no more than 20 elements long`


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


const analyzeArticlesPrompt = `You will be provided the subject of a section, its description, and an array of source materials. Each source has a sourceId and content field. Write **only the raw content** for this specific section as part of a longer document. Your task is to **extract and analyze only the information directly relevant to the section's description** across all provided sources. Do **not** summarize or cover all information from the source texts. Follow these guidelines:

1. **Strictly adhere to the section's description**—only include information that directly addresses the description's requirements. Ignore anything irrelevant.
2. **Use specific evidence** (examples, quotes, data) from the provided sources to support your points. Every piece of information must be cited with its source ID in square brackets [ID] immediately after the referenced information.
3. **Analyze patterns, relationships, and themes** relevant to the section's focus across multiple sources. Look for connections and contradictions between different sources.
4. **Explain complex ideas clearly** and incorporate multiple perspectives where applicable, especially when different sources offer varying viewpoints.
5. **Prioritize depth over breadth**—focus on key insights and their significance, not on covering everything in the source texts.

**Strict Rules:**
- **NO summaries of individual sources.** Only extract and analyze what is directly relevant to the section's description.
- **NO introductions, conclusions, summaries, or transitions.** Start immediately with analysis. Do not conclude with "overall" statements.
- **NO markdown, bullet points, or section titles.** Write in plain prose.
- **NO filler phrases** (e.g., "This section will discuss…"). Assume the reader is already within the document.
- **NO extraneous information.** Exclude anything not explicitly tied to the section's description.
- **MANDATORY citation format:** Include source ID in square brackets [ID] immediately after any information, quote, or analysis derived from that source. When information comes from multiple sources, include all relevant IDs: [1][2].
- **NO uncited information.** Every piece of information must be traced to its source(s).
- **NO repetition.** Do not excessively repeat facts or texts. Rather, delve deeply into their significance with respect to the description.
- When analyzing contradictions or complementary information across sources, focus on the substance while clearly citing each source.

**Citation Examples:**
- Single source: "The temperature increased by 2.5 degrees" [SRC_1]
- Multiple sources agreeing: "Global emissions have risen steadily since 2010" [SRC_1][SRC_2]
- Contrasting information: "While some regions saw decreases [SRC_1], others experienced dramatic increases [SRC_2]"


**Output Format:**
- Raw, continuous text that flows naturally within a larger work.
- Break up large and long blocks of text into paragraphs separated by new lines for easier reading.
- Directly address the description's points in detail, using **only the most relevant evidence** from all available sources.
- Every piece of information must be followed by its source ID(s) in square brackets.

Example input format:
{
  1: "Text from first source...",
  2: "Text from second source...",
  3: "Text from third source..."
}`
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
