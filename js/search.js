// Global variables to accumulate texts, track processed links, and track tried search terms
let globalSourceTexts = "";
let globalProcessedLinks = new Set();
let globalTriedSearchTerms = new Set();

function appendURLS(links) {
    // Append each link to the UI and mark it as processed
    links.forEach(link => {
        // console.log(link);
        if (link.startsWith("https")) {
            const linkBase = link.includes('www.')
                ? link.split('www.')[1].split('/')[0]
                : link.split('//')[1].split('/')[0];
            $('.activity-sites').first().append($(`
                <div class="flex gap-x-1rem" style="padding: 1rem 0.5rem">
                    <div class="activity-link-status" data-activity-link-url="${link}">
                        <div></div>
                    </div>
                    <div class="flex flex-col">
                        <a class="activity-link" target="_blank" href="${link}">${linkBase}</a>
                        <div class="activity-char-count" data-activity-link-url="${link}"></div>
                        <div class="activity-errors" data-activity-link-url="${link}"></div>
                    </div>
                </div>
            `));
            globalProcessedLinks.add(link);
        }
    });
}

async function beginSearches() {
    newActivity('Getting relevant links');
    setPhase('findingLinks');
    
    const section = plan[0];

    let linksData = await getLinks(section.search_keywords);
    let links = linksData.result;

    if (links === 429) {
        newActivity('Too many requests to Google search.')
        $('.activity-working').removeClass('activity-working').css('color', '#ff3c3c')
        return;
    }

    // console.log(links);

    newActivity(`Searching ${links.length} links`);

    appendURLS(links)
    setPhase('fetchingLinks');

    await getTexts(links);

    let relevantAndNeededSources = await getRelevantAndNeededSources(section.description)

    // console.log(relevantAndNeededSources)

    if (relevantAndNeededSources.required_info_description) {

        const search_term = relevantAndNeededSources.search_term

        newActivity(`\n\nI need more information on ${relevantAndNeededSources.required_info_description}`)
        newActivity(`Searching phrase: ${relevantAndNeededSources.search_term}`)

        links = await getLinks(search_term)
        links = links.result
        newActivity(`Searching ${links.length} links`);

        appendURLS(links)

        // Capture the keys already present in the global `sources`
        const sourcesBeforeKeys = new Set(Object.keys(sources));

        // Fetch texts for the new links which adds new sources to the global object
        await getTexts(links);

        // Determine which sources were newly added
        const newSourceKeys = Object.keys(sources).filter(key => !sourcesBeforeKeys.has(key));
        const newSources = {};
        newSourceKeys.forEach(key => {
            newSources[key] = sources[key];
        });

        // console.log('newSources: ', newSources)

        await new Promise(resolve => setTimeout(resolve, 10000));

        // Now pass only the new sources to checkIfSourceFulfillsDescription
        await checkIfSourceFulfillsDescription(newSources, relevantAndNeededSources.required_info_description);
    }

    newActivity(`Choosing sources`)
    addToModalMessage(`\n\nI'm choosing sources relevant to these requirements: ${plan[0].description}`)

    relevantAndNeededSources = await getRelevantAndNeededSources(section.description)

    const required_source_ids = relevantAndNeededSources.source_ids

    newActivity(`Using ${required_source_ids.length} sources`)

    let sourceTexts;
    required_source_ids.forEach(id => {
        sourceTexts += sources[id].text + ' '
    })

    newActivity(`Source text: ${sourceTexts.length.toLocaleString()} chars / ${sourceTexts.split(' ').length.toLocaleString()} words`)

    analyzeSearch(sourceTexts, section);



    // while (!isEmpty(remainingRequirements)) {
    // }

    // Build the text string only for this iteration
    // let initialSourceText = "";
    // textsData.result.forEach(result => {
    //     initialSourceText += result.text;
    // });

    // console.log('Initial search text: ', initialSourceText);
    // newActivity(`Analyzing ${textsData.result.length} links`);

    // // Begin checking using only the texts from this search iteration
    // globalSourceTexts += initialSourceText
    // checkIfEnoughContext(section, initialSourceText);
}


async function checkIfSourceFulfillsDescription(candidateSources, requiredDescription) {
    // Use only candidateSources' descriptions (i.e. the new sources) for the check
    const candidateSourceDescriptions = Object.values(candidateSources)
        .map(source => source.description)
        .filter(desc => desc && desc.trim().length > 0);
        
    const triedKeywordsArray = Array.from(globalTriedSearchTerms);
    // Prepare prompt input combining the required description, the new source descriptions, 
    // and previously tried keywords
    const promptInput = `Required information description: ${requiredDescription}
                        Source descriptions (new sources): ${JSON.stringify(candidateSourceDescriptions)}
                        Previously attempted search terms: ${JSON.stringify(triedKeywordsArray)}`;

    const messages_payload = [
        { role: "system", content: checkFulfillsDescriptionPrompt },
        { role: "user", content: promptInput }
    ];

    let data = await sendRequestToDecoder(messages_payload);
    let response;
    try {
        response = JSON.parse(data.choices[0].message.content);
    } catch (e) {
        console.error("Error parsing checkIfSourceFulfillsDescription response:", e);
        // In case of a parsing error, assume the sources do not fulfill the requirement.
        return false;
    }

    console.log(response);

    if (response.fulfills === true) {
        newActivity("New sources fulfill the required description.");
        return true;
    } else {
        newActivity(`Missing information: ${response.missing_information}`);
        newActivity(`Searching for more sources using search term: "${response.search_term}"`);

        // Track the search term so it is not reused in subsequent iterations
        globalTriedSearchTerms.add(response.search_term);
        
        // Fetch new links based on the search term provided by the prompt
        const linksData = await getLinks(response.search_term);
        // Filter out links that have already been processed
        let newLinks = linksData.result.filter(link => !globalProcessedLinks.has(link));

        if (newLinks.length === 0) {
            newActivity("No new links found for additional information.");
            return false;
        }        
        
        newActivity(`Searching ${newLinks.length} websites.`);
        appendURLS(newLinks);

        // Capture the keys before fetching new texts
        const sourcesBeforeKeys = new Set(Object.keys(sources));
        // Fetch texts from the new links; this will update the global 'sources' object.
        await getTexts(newLinks);
        // await new Promise(resolve => setTimeout(resolve, 10000));

        // Determine which sources were newly added
        const newSourceKeys = Object.keys(sources).filter(key => !sourcesBeforeKeys.has(key));
        const newSources = {};
        newSourceKeys.forEach(key => {
            newSources[key] = sources[key];
        });

        // await new Promise(resolve => setTimeout(resolve, 10000));
        // Recursively check again—but now only with the newly added sources.
        return await checkIfSourceFulfillsDescription(newSources, requiredDescription);
    }
}



async function getRelevantAndNeededSources(sectionDescription) {

    let sourceDescriptions = {}
    for (const [key, value] of Object.entries(sources)) {
        sourceDescriptions[key] = value.description;
    }

    const messages_payload = [
        { role: "system", content: selectSourcesPrompt },
        { role: "user", content: `
            description: ${sectionDescription}
            sources: ${JSON.stringify(sourceDescriptions)}
        ` }
    ];

    const data = await sendRequestToDecoder(messages_payload);
    let content = data.choices[0].message.content;
    try {
        content = JSON.parse(content);
        addTokenUsageToActivity(data.usage)
    } catch (e) {
        console.error("Error parsing decoder response:", e);
        console.log("Response content:", content);
        throw e;
    }
    return content;
}

async function checkIfEnoughContext(section, currentSourceText) {
    // console.log('Checking context using current search text:', currentSourceText);

    const messages_payload = [
        { role: "system", content: determineIfEnoughInfoPrompt },
        { role: "user", content: `
            Here are the inputs:
            - Description of paragraph requirements: ${section.description}
            - Source text context: ${globalSourceTexts}
        ` }
    ];

    let data = await sendRequestToDecoder(messages_payload, true);
    const usage = data.usage;
    addTokenUsageToActivity(usage);

    let content;
    try {
        content = JSON.parse(data.choices[0].message.content);
    } catch (e) {
        console.error("Error parsing decoder response:", e);
        // In case of parsing error, assume not enough info and use the section keywords as fallback.
        content = {
            has_enough_information: false,
            missing_information: "Unable to parse response",
            search_term: section.search_keywords
        };
    }

    if (!content.has_enough_information) {

        console.log(content)

        const keywords = content.search_term;
        newActivity(`We need more information on ${keywords}`);
        const missing_information = content.missing_information;
        newModelMessageElm(true);
        addToModalMessage(`We're missing some information: ${missing_information}`);
        
        newActivity(`Searching for websites`);

        // Fetch new links based on the new keywords
        const linksData = await getLinks(keywords);
        // Filter out links that have already been processed
        let newLinks = linksData.result.filter(link => !globalProcessedLinks.has(link));

        if (newLinks.length === 0) {
            newActivity("No new links found for additional information. Stopping further searches.");
            return;
        }

        newActivity(`Found ${newLinks.length} relevant links`);

        appendURLS(newLinks)

        newActivity(`Analyzing ${newLinks.length} websites`);

        // Fetch texts for the new links and update their UI elements
        const newTextsData = await getTexts(newLinks);
        updateActivityLinkColors(newTextsData.result, newLinks);
                
        let newSourceText = "";
        newTextsData.result.forEach(result => {
            newSourceText += result.text;
        });
        console.log("New search text: ", newSourceText);

        // Optionally, update the global accumulation if needed later.
        globalSourceTexts += newSourceText;

        // Recurse using only the new search's texts
        return checkIfEnoughContext(section, newSourceText);
    } else {
        // If enough information is found, proceed with analysis.
        newActivity('Understanding the current context')
        setPhase('analyzingLinks');
        analyzeSearch(globalSourceTexts, section);
    }
}



// The other functions remain unchanged:

function sendRequestToDecoder(messages_payload, max_tokens) {
    return new Promise((resolve, reject) => {
        let payload = {
            model: decoderModelId,
            // repetition_penalty: 1.1,
            temperature: 0.7,
            top_p: 0.9,
            // top_k: 40,
            messages: messages_payload,
        };

        if (max_tokens) {
            payload['max_tokens'] = max_tokens
        }

        fetch(decoderBase, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${decoderKey}`
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(data => {
            resolve(data);
        })
        .catch(error => {
            console.error('Error:', error);
            reject(error);
        });
    });
}


async function analyzeSearch(searchData, section) {
    console.log(searchData);

    const section_title = section.section_title;
    const description = section.description;

    const messages_payload = [
        { role: "system", content: analyzeArticlesPrompt },
        { role: "user", content: `
            The general subject of this section is: ${section_title}
            The description of the section and its requirements is: ${description}
            The entirety of the source text is: ${searchData}}
        ` }
    ];

    const data = await sendRequestToDecoder(messages_payload);
    const content = data.choices[0].message.content;

    console.log(content);
    const usage = data.usage;
    newModelMessageElm(true);
    addToModalMessage(content);
    addTokenUsageToActivity(usage);
    newActivity('Drafted the section');
}


function getLinks(keywords) {
    return new Promise((resolve, reject) => {
        fetch(`http://localhost:8000/get_links?keywords=${encodeURIComponent(keywords)}`)
            .then(response => response.json())
            .then(data => {
                resolve(data);
            })
            .catch(error => {
                console.error('Error:', error);
                reject(error);
            });
    });
}


function updateActivityLinkColors(results) {
    $('.activity-sites:has(div)').first().find('div.activity-link-status > div').css('background-color', 'red');
    results.forEach(result => {
        const url = result.url;
        $(`div.activity-link-status[data-activity-link-url="${url}"] > div`).css('background-color', 'lime');
        $(`div.activity-char-count[data-activity-link-url="${url}"]`).text(
            result.length.toLocaleString() + ' chars/' + result.text.split(/\s+/).length.toLocaleString() + ' words'
        );
    });
}


let sources = {}


async function categorizeSource(index, source) {
    const url = getBaseUrl(source.url)

    newActivity(`Understanding ${url}`)
    const messages_payload = [
        { role: "system", content: categorizeSourcePrompt },
        { role: "user", content: `
            The text body is: ${source.text}
        ` }
    ]
    const data = await sendRequestToDecoder(messages_payload, '1024')
    addTokenUsageToActivity(data.usage)
    let content;
    try {
        content = JSON.parse(data.choices[0].message.content);
        // Move these lines inside the try block so they only execute on success
        addToModalMessage(`\n\n${url} contains ${content.description.charAt(0).toLowerCase() + content.description.slice(1)}`)
        sources[index]['description'] = content.description
        return content.description

    } catch (error) { 
        // console.error('Error parsing JSON:', error);
        $(`div.activity-errors[data-activity-link-url="${source.url}"]`)
            .removeAttr('data-activity-link-url')
            .text("Failed to parse");
        $(`div.activity-link-status[data-activity-link-url="${source.url}"] > div`)
            .parent()
            .removeAttr('data-activity-link-url')
            .find('div')
            .css('background-color', 'red');
        globalProcessedLinks.delete(source.url);
        console.log(`Failed to parse JSON for website: ${url}`)
        console.log('JSON content:', data.choices[0].message.content);
        // throw error; // Re-throw the error after logging
    }
}


async function removeRemainingCategories(categorizations) {

    newActivity("Updating requirements")

    const messages_payload = [
        { role: "system", content: removeRemainingCategoriesPrompt },
        { role: "user", content: `
            required_sources: ${Object.values(requirements)}
            descriptions: ${categorizations}
        ` }
    ]
    const data = await sendRequestToDecoder(messages_payload)
    const content = JSON.parse(data.choices[0].message.content);

    console.log(content)
    const requirements_to_eliminate = content.existing_source_ids;

    requirements_to_eliminate.forEach(req => {
        console.log(`Removing requirement with key: ${remainingRequirements[req]}`);
        delete remainingRequirements[req];
    });
}


async function getTexts(links) {
    let data;
    try {
        const response = await fetch(`http://localhost:8000/get_link_texts?links=${encodeURIComponent(links)}`);
        data = await response.json();
    } catch (error) {
        newActivity('Failed to fetch websites.');
        throw error; // Re-throw the error after logging the activity
    }

    let categorizations = [];
    updateActivityLinkColors(data.result, links); // Corrected variable name

    newActivity(`Analyzing ${data.result.length} websites`)

    const startIndex = Object.keys(sources).length; // Determine the starting index
    for (let index = 0; index < data.result.length; index++) {
        const source = data.result[index];
        const this_source = {
            'url': source.url,
            'text': source.text,
            'length': source.length
        };
        sources[startIndex + index] = this_source; // Add to sources
        $('.status-option-sources').text(`Sources (${Object.keys(sources).length})`)

        // Await inside loop since we are in an async function now
        const description = await categorizeSource(startIndex + index, this_source);
        // console.log(description)
        categorizations.push(description);
    }

    // removeRemainingCategories(categorizations);

    return data;
}

function getBaseUrl(url) {
    let baseUrl = url.replace(/^https?:\/\//, '');
    baseUrl = baseUrl.replace(/^www\./, '');
    baseUrl = baseUrl.split('/')[0];
    return baseUrl;
}


