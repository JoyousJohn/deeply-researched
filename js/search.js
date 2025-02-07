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

    const relevantAndNeededSources = await getRelevantAndNeededSources(section.description)

    // console.log(relevantAndNeededSources)

    if (relevantAndNeededSources.required_info_description) {

        const search_term = relevantAndNeededSources.search_term

        newActivity(`I need more information on ${relevantAndNeededSources.required_info_description}`)

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
        checkIfSourceFulfillsDescription(newSources, relevantAndNeededSources.required_info_description);
    }

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
    // Use the global 'sources' variable (accumulated from all getTexts calls)
    const allSources = sources; 
    const sourceDescriptions = Object.values(allSources)
        .map(source => source.description)
        .filter(desc => desc && desc.trim().length > 0);
        
    const triedKeywordsArray = Array.from(globalTriedSearchTerms);
    // Prepare prompt input combining the required description, collected source descriptions, and previously tried keywords
    const promptInput = `Required information description: ${requiredDescription}
Source descriptions: ${JSON.stringify(sourceDescriptions)}
Previously attempted search terms: ${JSON.stringify(triedKeywordsArray)}`;

    // console.log('requiredDescription: ', requiredDescription);
    // console.log('sourceDescriptions: ', sourceDescriptions);
    // console.log('Previously tried search terms: ', triedKeywordsArray);

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

    console.log(response)

    if (response.fulfills === true) {
        newActivity("New sources fulfill the required description.");
        return true;
    } else {
        newActivity(`Missing information: ${response.missing_information}.`);
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

        appendURLS(newLinks);

        newActivity(`Analyzing ${newLinks.length} new websites.`);
        // Fetch texts from the new links; this will update the global 'sources' object.
        await getTexts(newLinks);

        await new Promise(resolve => setTimeout(resolve, 10000));

        // Recursively check again with the updated global sources
        await new Promise(resolve => setTimeout(resolve, 10000));
        return await checkIfSourceFulfillsDescription(candidateSources, requiredDescription);
    }
}



async function getRelevantAndNeededSources(sectionDescription) {
    const messages_payload = [
        { role: "system", content: selectSourcesPrompt },
        { role: "user", content: `
            description: ${sectionDescription}
            sources: ${JSON.stringify(requirements)}
        ` }
    ];

    const data = await sendRequestToDecoder(messages_payload);
    return JSON.parse(data.choices[0].message.content);
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
        newModelMessageElm();
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

function sendRequestToDecoder(messages_payload, json_mode) {
    return new Promise((resolve, reject) => {
        let payload = {
            model: decoderModelId,
            // repetition_penalty: 1.1,
            temperature: 0.7,
            top_p: 0.9,
            // top_k: 40,
            messages: messages_payload,
        };

        // if (json_mode) {
        //     payload['response_format'] = { type: "json_object" }
        // }

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
            The section topic is: ${section_title}
            The section description is: ${description}
            The source texts are: ${searchData}}
        ` }
    ];

    const data = await sendRequestToDecoder(messages_payload);
    const content = data.choices[0].message.content;

    console.log(content);
    const usage = data.usage;
    newModelMessageElm(content);
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
    newActivity(`Understanding ${getBaseUrl(source.url)}`)
    const messages_payload = [
        { role: "system", content: categorizeSourcePrompt },
        { role: "user", content: `
            The text body is: ${source.text}
        ` }
    ]
    const data = await sendRequestToDecoder(messages_payload)
    addTokenUsageToActivity(data.usage)
    const content = JSON.parse(data.choices[0].message.content);

    sources[index]['description'] = content.description

    return content.description

    // sources[index]['categories'] = content.categories

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

    const response = await fetch(`http://localhost:8000/get_link_texts?links=${encodeURIComponent(links)}`);
    const data = await response.json();

    let categorizations = [];
    updateActivityLinkColors(data.result, links); // Corrected variable name

    const startIndex = Object.keys(sources).length; // Determine the starting index
    for (let index = 0; index < data.result.length; index++) {
        const source = data.result[index];
        const this_source = {
            'url': source.url,
            'text': source.text,
            'length': source.length
        };
        sources[startIndex + index] = this_source; // Add to sources

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


