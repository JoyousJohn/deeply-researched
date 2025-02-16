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


const narrowQuestionPrompt = `You are a consultant who helps users refine their complex queries or tasks. The user will provide a directive that needs deep analysis and careful consideration. Your task is to help narrow down exactly what they're trying to learn or achieve.

IMPORTANT: Respond with raw JSON only, no markdown formatting or code blocks. The response must be a single JSON object with exactly two keys:
- "preamble": a string containing your acknowledgment of the query and statement about asking clarifying questions
- "questions": an array of 3-5 strings, where each question helps narrow down:
   - What part of the topic they want to focus on
   - The level of detail they're looking for
   - The format that would be most helpful
   - The specific aspect they want to understand better
   - The particular problems they're trying to solve

Each question must:
- Be a single concise sentence
- Help narrow down their learning goals or needs
- Transform broad requests into specific areas of focus
- Clarify which aspects are most relevant to them
- Avoid asking them to explain concepts or demonstrate knowledge

Instead of asking "What do you know about X?", ask "Would you like to focus on the basics of X or a particular aspect?"
Instead of asking "Can you explain Y?", ask "Should we cover Y in depth or just the key points?"

If the directive is vague, frame your questions to help identify which specific parts of the topic they want to explore.

Example format:
{
  "preamble": "I'll help you focus on the aspects of X that are most relevant to your needs.",
  "questions": [
    "Would you like to start with the fundamentals or focus on a specific aspect?",
    "Should this cover a broad overview or dive deep into particular areas?",
    "Would examples and practical applications be more helpful than theoretical concepts?"
  ]
}

Do not include any text before or after the JSON object.`


const refactorPrompt = `You are a research query analyzer. Your task is to analyze a user's initial query, follow-up questions, and their answers, then provide three key pieces of information in JSON format:

{
    "query": <string describing the core information needs>,
    "content_requirements": <array of strings listing mandatory content elements>, // Changed to an ARRAY
    "formatting_requirements": <string containing specific textual formatting requirements, if any>
}

Ensure your JSON is valid and well-constructed.  Do NOT include any text outside the JSON object.

For the query analysis:
- Focus solely on identifying the core information need.
- Maintain absolute specificity - identify exact concepts, relationships, or data points.
- Preserve all technical terminology from the original query and follow-up answers.
- Include implicit information needs that are logically necessary.
- Specify temporal, geographical, or contextual constraints.
- Incorporate all relevant context from follow-up Q&A.
- Include any franchises, individuals, companies, etc., that are relevant.
- Begin with "This query seeks information about..."
- Do NOT include any formatting requirements or content elements in this section.

For the required content elements:
- List *each* specifically requested topic that must be covered as a *separate string* in the JSON array.  This is a list of *things* the response should contain.
- Include any mandatory examples, case studies, or scenarios.
- Specify required data points or metrics that *must* be included.
- List any specific theories, methods, or approaches that *must* be discussed.
- Include any historical context or background that *must* be provided.
- Specify any required definitions or explanations.
- List any mandatory comparisons or contrasts.
- Include any required perspectives or viewpoints.
- Specify any necessary calculations or analyses.
- List any required recommendations or solutions.

For the formatting requirements:
- Include *only* requirements related to the *textual formatting* of the response. This includes things like:
    - Specific formats (tables, lists, diagrams, etc.) -  *How* the data should be presented
    - Structure of the response (paragraphs, sections, etc.) - *How* the content should be organized
    - Any specific organizational requirements - *How* the text should be laid out.
- Do *not* include any *content* requirements here.  The formatting requirements should only describe *how* the content should be presented, not *what* the content should be.

Note: If parts of the follow-up answers do not relate to the initial query or questions, ignore these parts.

Input Format:
USER_QUERY: [Initial user query text]
QUESTIONS_ASKED: [Array of follow-up questions that were asked]
USER_ANSWERS: [Array of user's responses to those questions]
`;


const createSections = `You are tasked with creating a comprehensive document structure. You will be provided with three inputs: 1) a detailed query describing the core information needs, 2) specific formatting requirements, and 3) an *array* of required content elements. Your task is to create detailed sections that address these requirements while adhering to the specified formatting.

You are to focus on incorporating all three inputs into an organized structure. Do not introduce information beyond what was specified in these inputs. Focus solely on organizing content that fulfills the stated needs.

Your task is to create detailed sections for a professional document that will fully address all requirements from the three inputs. Each section should be clearly defined with an extremely detailed explanation of what specific information, data, analysis, and writing must be included to fulfill the requests. These sections must have a clear purpose tied directly to the three inputs.

Guidelines:

* Include only the sections necessary to comprehensively address the explicit goals from all three inputs. Do not add sections based on assumptions or general knowledge of the topic.
* Ensure each section has a clear purpose directly related to the query, follows the formatting requirements, and incorporates the required content elements.
* Focus exclusively on organizing and structuring the information specified in the three inputs. Do not infer or add implicit needs.
* The description for each section should comprehensively detail:
    * Exactly what information from the query should be included. Be specific about *how* the query will be used to generate content for this section.
    * How to implement the specified formatting requirements. Be specific about how the formatting will be applied to the content of this section.
    * How to incorporate *each* required content element from the *array*. Be specific about how *each* element will be included and where it should be placed.
    * How the information should be presented and structured. Describe the logical flow and organization of content within the section.
    * Key topics that *must* be covered based on all inputs. List the essential topics that the model should address.
    * Keep descriptions of the content covered within each section unique and exclusive of the other sections. Explicitly state what information is *not* included in this section to avoid overlap.

The sections must not overlap in purpose. Each description should not cover information already mentioned in other sections.

Return a JSON array where each object represents a document section. If there's only one section, still return it in an array. The response MUST:

* Contain ONLY valid JSON with no additional text or formatting. Do not surround the JSON in backticks. Do not add newline characters. Do not format the JSON as a code block. Return the JSON in raw-text.
* Include exactly these two fields for each section:
    * "section_title": String containing a clear, professional title for the section. The title should be concise and descriptive of the section's content.
    * "description": String containing an extremely detailed explanation of how to implement all requirements from the three inputs for this section. The description should be actionable and provide clear instructions for content generation. Do not include any newline characters in the description.

Input Format:
QUERY: [String describing the core information needs]
FORMATTING_REQUIREMENTS: [String containing specific formatting requirements]
CONTENT_REQUIREMENTS: [JSON array of strings listing mandatory content elements]  // Note the array

Example format:

[
    {
        "section_title": "string: professional title 1 of the section",
        "description": "string: comprehensive explanation of how to implement all requirements from the three inputs for this section"
    },
    {
        "section_title": "string: professional title 2 of the section",
        "description": "string: comprehensive explanation of how to implement all requirements from the three inputs for this section"
    }
]
`;


const generateSubsectionsPrompt = `You are a document content generator. You will be provided with the following inputs:

1. SECTION_TITLE: The title of the section for which you need to generate content.
2. SECTION_DESCRIPTION:  A detailed description of the content required for this section, including specific information needs, formatting requirements, and content elements.
3. FORMATTING_REQUIREMENTS (Overall): Overall formatting requirements for the entire document.
4. CONTENT_REQUIREMENTS (Overall): Overall content requirements for the entire document.

Your task is to generate detailed subsections for the given section, based on the provided information.  These subsections should break down the section's content into smaller, more manageable chunks.  Each subsection should focus on a specific aspect of the section's overall topic.

Return a JSON array where each object represents a subsection. The response MUST:

* Contain ONLY valid JSON with no additional text or formatting. Do not surround the JSON in backticks. Do not add newline characters. Do not format the JSON as a code block. Return the JSON in raw-text.
* Include exactly these two fields for each subsection:
    * "subsection_title": String containing a clear, professional title for the subsection. The title should be concise and descriptive of the subsection's content.
    * "subsection_content_requirements": String containing a detailed description of the specific content required for this subsection. This should be derived from the SECTION_DESCRIPTION, FORMATTING_REQUIREMENTS, and CONTENT_REQUIREMENTS.  Be as specific as possible about what information, data, analysis, and writing must be included in this subsection.

Guidelines:

* The subsections should comprehensively cover all aspects of the SECTION_DESCRIPTION.
* Each subsection should have a clear and distinct focus.
* The subsection_content_requirements should be actionable and provide clear instructions for content generation.  It should be specific about what information should be included, how it should be presented, and any formatting requirements that apply specifically to the subsection.
* The subsection_content_requirements should refer to specific content elements from the overall CONTENT_REQUIREMENTS where relevant.
* Do not generate the actual content of the subsections in this prompt.  Only generate the subsection titles and their content requirements.

Input Format:

SECTION_TITLE: [String containing the section title]
SECTION_DESCRIPTION: [String containing the section description]
FORMATTING_REQUIREMENTS (Overall): [String containing overall formatting requirements]
CONTENT_REQUIREMENTS (Overall): [JSON array of strings listing overall content elements]

Example format:

[
    {
        "subsection_title": "string: professional title 1 of the subsection",
        "subsection_content_requirements": "string: detailed description of the specific content required for this subsection"
    },
    {
        "subsection_title": "string: professional title 2 of the subsection",
        "subsection_content_requirements": "string: detailed description of the specific content required for this subsection"
    }
]
`;


const generateSubsectionContentFromSearchPrompt = `
Generate content for the subsection titled '{SUBSECTION_TITLE}'.

Consider the following information:

*   **Section Title:** {SECTION_TITLE}
*   **Section Description:** {SECTION_DESCRIPTION}
*   **Subsection Content Requirements:** {SUBSECTION_CONTENT_REQUIREMENTS}
*   **Relevant Source Texts:**
    \`\`\`json
    {SOURCE_TEXTS}
    \`\`\`

Instructions:

You will be provided the subject of a subsection, its content requirements, and an array of source materials. Each source has a sourceId and content field. Write **only the raw content** for this specific subsection as part of a longer document. Your task is to **extract and analyze only the information directly relevant to the subsection's content requirements** across all provided sources. Do **not** summarize or cover all information from the source texts. Follow these guidelines:

1.  **Strictly adhere to the subsection's content requirements**—only include information that directly addresses the requirements. Ignore anything irrelevant.
2.  **Use specific evidence** (examples, quotes, data) from the provided sources to support your points. Every piece of information must be cited with its source ID in square brackets [SRC_x] immediately after the referenced information.
3.  **Analyze patterns, relationships, and themes** relevant to the subsection's focus across multiple sources. Look for connections and contradictions between different sources.
4.  **Explain complex ideas clearly** and incorporate multiple perspectives where applicable, especially when different sources offer varying viewpoints.
5.  **Prioritize depth over breadth**—focus on key insights and their significance, not on covering everything in the source texts.

**Strict Rules:**

*   **NO summaries of individual sources.** Only extract and analyze what is directly relevant to the subsection's content requirements.
*   **NO introductions, conclusions, summaries, or transitions.** Start immediately with analysis. Do not conclude with "overall" statements.
*   **NO markdown, bullet points, or section titles.** Write in plain prose.
*   **NO filler phrases** (e.g., "This subsection will discuss…"). Assume the reader is already within the document.
*   **NO extraneous information.** Exclude anything not explicitly tied to the subsection's content requirements.
*   **NO repetition.** Do not excessively repeat facts or texts. Rather, delve deeply into their significance with respect to the content requirements.

**Citation Rules - STRICTLY ENFORCED:**

*   EVERY sentence MUST end with at least one source citation [SRC_x]
*   Multiple source citations must be in ascending numerical order [SRC_1][SRC_2]
*   Citations must use the exact format [SRC_x] - no variations allowed
*   Any uncited sentence will be considered invalid output
*   Citations must appear immediately after the relevant information
*   When combining information from multiple sources, cite all relevant sources

**Invalid Citation Examples:**

*   Missing citation: "The temperature increased by 2.5 degrees"
*   Wrong format: (SRC_1) or [Source 1] or [1]
*   Delayed citation: "The temperature increased by 2.5 degrees. Later that year..." [SRC_1]

**Valid Citation Examples:**

*   "The temperature increased by 2.5 degrees" [SRC_1]
*   "Global emissions rose steadily" [SRC_1][SRC_2]
*   "While some regions saw decreases [SRC_1], others experienced increases" [SRC_2]

**Output Validation Requirements:**

1.  Every paragraph must contain at least one citation
2.  No uncited claims or analysis are allowed
3.  Each source citation must use the exact [SRC_x] format
4.  Citations must appear immediately after the referenced information
5.  Analysis combining multiple sources must cite all relevant sources

**Before submitting your response, verify that:**

*   Every sentence has at least one citation
*   All citations use the correct [SRC_x] format
*   No information appears without a corresponding citation
*   Citations are properly placed immediately after the referenced information

**Output Format:**

*   Raw, continuous text that flows naturally within a larger work.
*   Break up large and long blocks of text into paragraphs separated by new lines for easier reading.
*   Directly address the content requirements's points in detail, using **only the most relevant evidence** from all available sources.
*   Every piece of information must be followed by its source ID(s) in square brackets.
`;



const reviseDocumentPrompt = `Analyze if this OUTLINE will effectively support creating a final document that meets the specified requirements. Return a JSON object in one of these formats:

IF THIS OUTLINE WILL SUPPORT CREATING A DOCUMENT THAT MEETS REQUIREMENTS:
{
    "requirements_met": true
}

IF THIS OUTLINE NEEDS CHANGES TO SUPPORT THE FINAL DOCUMENT:
{
    "requirements_met": false,
    "modified_layout": [
        {
            "section_title": "title for this section of the final document",
            "description": "what content this section should cover to support the final document requirements"
        }
    ],
    "changes_needed": {
        "format": "what was changed in the outline to better support final document structure",
        "content": "what was changed in the outline to better support final document content"
    },
    "requirements_verification": ["how this outline will support meeting each requirement in the final document"]
}

Input Structure:
{
    "DOCUMENT_LAYOUT": [
        {
            "section_title": "section title",
            "description": "what this section will cover"
        }
    ],
    "FORMAT_REQUIREMENTS": "how the FINAL DOCUMENT should be structured",
    "CONTENT_REQUIREMENTS": "what topics the FINAL DOCUMENT must cover"
}

Rules:
- FORMAT_REQUIREMENTS and CONTENT_REQUIREMENTS describe the FINAL DOCUMENT to be created
- The outline (DOCUMENT_LAYOUT) exists to support creating that final document
- Evaluate if this outline will help create a document meeting those requirements
- modified_layout should provide a better outline that supports the final requirements
- Do not modify the outline's format - modify its content to support final document needs`



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

function getSelectSourcesPrompt() {
    const maxSources = settings.maxSources; // Get the current maxSources value from settings
    return `Task: Analyze a research section description and identify the most relevant information sources (maximum ${maxSources}) from the provided dictionary, prioritizing the most critical and directly relevant sources while maintaining thoroughness in selection. Return a JSON object with prioritized source IDs and/or missing information details.

Inputs:
1. description: String describing the content needed for a paper section.
2. sources: Dictionary where keys are numerical source IDs and values are source content descriptions.

Source Selection Guidelines:
- Select up to ${maxSources} of the most relevant sources, prioritizing those that:
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
    - source_ids: List of up to ${maxSources} most relevant source IDs (if any)
    - Conditionally include:
      * required_info_description: Brief text listing the missing information (if sources are insufficient)
      * search_term: Search engine query to find missing information (if sources are insufficient)
2. Response logic:
    - Fully covered: Return only source_ids with most relevant sources (max ${maxSources})
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
    "source_ids": ["SRC_1", "SRC_2", "SRC_3", "SRC_4", "SRC_7", "SRC_9"], (List of most relevant source IDs, maximum of ${maxBranches})
    "required_info_description": "string", (Only include if information is missing)
    "search_term": "string" (Only include if information is missing)
}

Important: The missing_information sentence should be complete this sentence: "This text is missing... <missing_information>"!

Before finalizing response:
- Verify that the most critical sources are included
- Ensure sources provide comprehensive coverage of key aspects
- Confirm selection represents the most important perspectives
- Check that the source_ids list is properly prioritized
- Ensure the source_ids array is no more than ${maxSources} elements long
`;
}

const generateMissingInfoPrompt = `Task: Analyze a research section description and generate a specific description of required information and a targeted search query to find that information. The output should be precise enough to guide effective information gathering while being concise.

Input:
- description: String describing the content needed for a paper section.

Guidelines for Identifying Required Information:
- Focus on identifying information that:
  * Addresses core topics and concepts
  * Covers key methodological aspects
  * Includes essential empirical evidence
  * Provides critical theoretical frameworks
  * Offers necessary context or background
  * Represents foundational work
  * Presents authoritative perspectives

Also consider information needs that:
  * Approach the topic from different angles
  * Provide supporting evidence
  * Offer complementary perspectives
  * Present alternative interpretations

Evaluation Process:
1. First pass: Identify core information requirements
2. Second pass: Evaluate completeness and specificity
3. Third pass: Refine and focus description
4. Final pass: Review and confirm precision

Requirements:
1. Return a JSON object containing:
    - required_info_description: Brief text listing the needed information
    - search_term: Search engine query to find this information

Important formatting rules:
- Do not return any text outside of the JSON object
- Do not format or prettify your response
- Return your JSON object response in raw-text
- The description should be one continuous string without line breaks
- Do not wrap your response in a json code block
- Do not wrap your response with backticks
- Do not return any notes or comments

Important: The required_info_description must complete this sentence: "This text is missing... <missing_information>"

Example response:
{
    "required_info_description": "string",
    "search_term": "string"
}

Before finalizing response:
- Verify the description captures critical information needs
- Ensure comprehensive coverage of key aspects
- Confirm specificity and clarity
- Check that the search term is properly focused`



const selectOnlySourcesPrompt = `Task: Analyze a research section description and identify the most relevant information sources (maximum 20) from the provided dictionary, prioritizing the most critical and directly relevant sources.

Source Selection Guidelines:
- Select up to 15 of the most relevant sources, prioritizing those that:
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
- The source_ids value should be an array of up to 15 source ID strings
- IDs should be ordered by relevance/importance

Important formatting rules:
- Do not return any text outside of the JSON object
- Do not format or prettify your response
- Return your JSON object response in raw-text
- Do not wrap your response in a json code block
- Do not wrap your response with backticks
- Do not return any notes or comments

Example response:
{"source_ids":["SRC_1", "SRC_2", "SRC_3", "SRC_4", "SRC_7", "SRC_9"]}

Before finalizing response:
- Verify that the most critical sources are included
- Ensure sources provide comprehensive coverage of key aspects
- Confirm selection represents the most important perspectives
- Check that the source_ids list is properly prioritized
- Ensure the source_ids array is no more than 15 elements long`


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


const analyzeArticlesPrompt = `
... (previous content remains the same)

**Citation Rules - STRICTLY ENFORCED:**
- EVERY sentence MUST end with at least one source citation [SRC_x]
- Multiple source citations must be in ascending numerical order [SRC_1][SRC_2]
- Citations must use the exact format [SRC_x] - no variations allowed
- Any uncited sentence will be considered invalid output
- Citations must appear immediately after the relevant information
- When combining information from multiple sources, cite all relevant sources

**Invalid Citation Examples:**
- Missing citation: "The temperature increased by 2.5 degrees"
- Wrong format: (SRC_1) or [Source 1] or [1]
- Delayed citation: "The temperature increased by 2.5 degrees. Later that year..." [SRC_1]

**Valid Citation Examples:**
- "The temperature increased by 2.5 degrees" [SRC_1]
- "Global emissions rose steadily" [SRC_1][SRC_2]
- "While some regions saw decreases [SRC_1], others experienced increases" [SRC_2]

**Output Validation Requirements:**
1. Every paragraph must contain at least one citation
2. No uncited claims or analysis are allowed
3. Each source citation must use the exact [SRC_x] format
4. Citations must appear immediately after the referenced information
5. Analysis combining multiple sources must cite all relevant sources

Before submitting your response, verify that:
- Every sentence has at least one citation
- All citations use the correct [SRC_x] format
- No information appears without a corresponding citation
- Citations are properly placed immediately after the referenced information`
// **After every paragraph in your response**: Include the source ID of the sources you used by wrwapping the source ID integer (from the supplied dictionary) in square brackets.

//- **NO uncited information.** Every piece of information must be traced to its source(s).




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
