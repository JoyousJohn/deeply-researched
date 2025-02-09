// Global variables to accumulate texts, track processed links, and track tried search terms
let globalSourceTexts = "";
let globalProcessedLinks = new Set();
let globalTriedSearchTerms = new Set();

let finalContent = []

let isWaiting = false; // Flag to track if a wait is in progress
let remainingWaitTime = 60000; // Initialize remaining wait time to 60 seconds

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
    setPhase('findingLinks');

    let count = 0;

    // Loop through all sections in the plan
    for (const section of plan) {
        count++;

        newActivity('Finding information for: ' + section.section_title)
        $('.current-section').text(`Working on section ${count}/${plan.length}`)

        let links;
        if (count === 1) {

            newActivity('Getting relevant links for: ' + section.section_title);

            let linksData = await getLinks(section.search_keywords);
            links = linksData.result;

            if (links === 429) {
                newActivity('Too many requests to Google search.')
                $('.activity-working').removeClass('activity-working').css('color', '#ff3c3c')
                return;
            }

            newActivity(`Searching ${links.length} links`);

            appendURLS(links)
            setPhase('fetchingLinks');

            await getTexts(links);

        }

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

            const sourcesBeforeKeys = new Set(Object.keys(sources));

            await getTexts(links);

            const newSourceKeys = Object.keys(sources).filter(key => !sourcesBeforeKeys.has(key));
            const newSources = {};
            newSourceKeys.forEach(key => {
                newSources[key] = sources[key];
            });

            // console.log('newSources: ', newSources)

            await checkIfSourceFulfillsDescription(newSources, relevantAndNeededSources.required_info_description);
        }

        newActivity(`Context validated`)

        newActivity(`Selecting sources`)
        addToModalMessage(`\n\nI'm choosing sources relevant to these requirements: ${section.description}`)

        // add that this only runs if the initial relevantAndNeededSources returned it has enough and didn't need to run. oteherwise checking if we have the relevant sources happens twice  on the same source ocuments data info.
        relevantAndNeededSources = await getRelevantAndNeededSources(section.description)

        const required_source_ids = relevantAndNeededSources.source_ids

        newActivity(`Using ${required_source_ids.length} sources`)

        let sourceTexts;
        required_source_ids.forEach(id => {
            sourceTexts += sources[id].text + ' '
        })

        newActivity(`Source text: ${sourceTexts.length.toLocaleString()} chars/${sourceTexts.split(' ').length.toLocaleString()} words`)
        newActivity("Drafting the section")

        await analyzeSearch(sourceTexts, section);
    }

    newActivity('Finished the response')
    $('.activity-working').first().removeClass('activity-working').css('color', '#5bfa5b')
    newModelMessageElm()

    const usage ={
        'in': 0,
        'out': 0,
        'total': 0
    }

    finalContent.forEach(section => {
        addToModalMessage('\n\n\n\n<span class="text-2rem">' + section.section_title + '</span>')
        addToModalMessage('\n\n' + section.section_content.trim())

        usage.in += section.tokens.in
        usage.out += section.tokens.out
    })

    enableBar();
    console.log("Timer before clear:", timer);
    stopTimer(); // Call the stopTimer function
    console.log("Timer after clear:", timer);
    $('.current-section').text('Done, awaiting instructions')

    usage.total += usage.in + usage.out
    $('.token-count').first().text(usage.in.toLocaleString() + ' / ' + usage.out.toLocaleString() + ' / ' + usage.total.toLocaleString() + ' total draft tokens')

}

// }


async function checkIfSourceFulfillsDescription(candidateSources, requiredDescription) {
    
    newActivity('Confirming source data')
    
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
        console.log("Response content:", data.choices[0].message.content);
        // In case of a parsing error, assume the sources do not fulfill the requirement.
        return false;
    }

    // console.log(response);

    if (response.fulfills === true) {
        newActivity("Fulfilled section requirements");
        addTokenUsageToActivity(data.usage)
        return true;
    } else {

        if (!response.missing_information) {
            console.log('missing')
            console.log(response)
        }

        newActivity(`Missing information: ${response.missing_information}`);
        addTokenUsageToActivity(data.usage)
        newActivity(`Searching for: "${response.search_term}"`);

        // Track the search term so it is not reused in subsequent iterations
        globalTriedSearchTerms.add(response.search_term);
        
        // Fetch new links based on the search term provided by the prompt
        const linksData = await getLinks(response.search_term);
        // Filter out links that have already been processed
        if (!Array.isArray(linksData.result)) {
            console.error("Error: linksData.result is not an array:", linksData.result);
            newActivity("Received unexpected data format for links.");
            return false;
        }
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

    newActivity('Examining current context')

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
    let content;
    try {
        content = data.choices[0].message.content;
        content = JSON.parse(content);
        addTokenUsageToActivity(data.usage)
    } catch (e) {
        console.error("Error parsing decoder response:", e);
        console.log("Response content:", content);
        newActivity('Error getting relevant and needed sources')
        throw e;
    }
    return content;
}



function sendRequestToDecoder(messages_payload, max_tokens) {
    return new Promise((resolve, reject) => {
        let payload = {
            model: decoderModelId,
            // repetition_penalty: 1.1,
            temperature: 0.7,
            top_p: 0.9,
            // top_k: 40,
            messages: messages_payload,
            max_tokens: 8192
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
        .then(response => {
            if (!response.ok) {
                if (response.status === 429) {
                    if (!isWaiting) {
                        isWaiting = true;
                        newActivity(`Received error 429: Too many requests. Retrying in 1 minute...`, is_error=true);
                        let countdown = remainingWaitTime / 1000;
                        const countdownInterval = setInterval(() => {
                            countdown--;
                            $('.activity-working').text(`Received error 429: Too many requests. Retrying in ${countdown}s...`);
                        }, 1000);
                        
                        return new Promise(resolve => setTimeout(() => {
                            clearInterval(countdownInterval);
                            newActivity(`Trying again after waiting for 1 minute...`);
                            $('.activity-error').removeClass('activity-working')
                            isWaiting = false;
                            resolve();
                        }, remainingWaitTime))
                        .then(() => sendRequestToDecoder(messages_payload, max_tokens));
                    } else {
                        return new Promise(resolve => setTimeout(resolve, remainingWaitTime));
                    }
                }
                newActivity(`Receive error: ${response.status}`);
                reject(new Error(`HTTP error! status: ${response.status}`));
            } else {
                return response.json(); // Return the promise for the JSON data
            }
        })
        .then(response_json => {
            if (!response_json) {
                throw new Error("Invalid response format: response_json is undefined.");
            } else if (!response_json.choices) {
                throw new Error("Invalid response format: response_json does not contain 'choices'.");
            } else if (response_json.choices.length === 0) {
                throw new Error("Invalid response format: response_json.choices is empty.");
            }
            
            // Modify the content as needed
            response_json.choices[0].message.content = response_json.choices[0].message.content.replace('```json', '').replace('```', '');
            resolve(response_json);
        })
        .catch(error => {
            console.error('Error:', error);
            reject(error);
        });
    });
}


async function analyzeSearch(searchData, section) {
    // console.log(searchData);

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
    const usage = data.usage;
    
    // Add error handling
    if (!data.choices) {
        console.error("Error: data.choices is undefined", data);
        newActivity("Failed to draft section")
        throw new Error("Invalid response structure");
    }

    finalContent.push({
        'section_title': section_title,
        'section_content': content,
        'tokens': {
            'in': usage.prompt_tokens,
            'out': usage.completion_tokens,
            'total': usage.prompt_tokens + usage.completion_tokens
        }
    })

    // console.log(content);
    newModelMessageElm(true);
    addToModalMessage(section_title)
    addToModalMessage('\n\n ' + content);
    // newActivity('Drafted the section');
    addTokenUsageToActivity(usage);
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


function updateActivityLinkColor(results) {
    results.forEach(result => {
        const url = result.url;
        const statusEl = $(`div.activity-link-status[data-activity-link-url="${url}"] > div`);
        
        if (result.length === 0) {
            statusEl.css('background-color', 'red');
        } else {
            statusEl.css('background-color', 'lime');
            $(`div.activity-char-count[data-activity-link-url="${url}"]`).text(
                result.length.toLocaleString() + ' chars / ' +
                result.text.split(/\s+/).length.toLocaleString() + ' words'
            );
        }
    })
}


let sources = {}


async function categorizeSource(index, source) {
    const url = getBaseUrl(source.url)

    newActivity(`Understanding ${url}`, source.url)
    const messages_payload = [
        { role: "system", content: categorizeSourcePrompt },
        { role: "user", content: `
            The text body is: ${source.text}
        ` }
    ]

    const data = await sendRequestToDecoder(messages_payload, 1024);
    if (!data) {
        handleError(source.url, url);
        return; // Exit the function if data is undefined
    }
    addTokenUsageToActivity(data.usage, source.url)
    let content;
    try {
        content = JSON.parse(data.choices[0].message.content);
        // Move these lines inside the try block so they only execute on success
        addToModalMessage(`\n\n${url} contains ${content.description.charAt(0).toLowerCase() + content.description.slice(1)}`);
        sources[index]['description'] = content.description;
        return content.description;

    } catch (error) {
        handleError(source.url, url);
        console.log('JSON content:', data.choices[0].message.content);
    }
}

function handleError(sourceUrl, url) {
    console.error("No data received from sendRequestToDecoder or failed to parse JSON");
    $(`div.activity-errors[data-activity-link-url="${sourceUrl}"]`)
        .removeAttr('data-activity-link-url')
        .text("Failed to parse");
    $(`div.activity-link-status[data-activity-link-url="${sourceUrl}"] > div`)
        .parent()
        .removeAttr('data-activity-link-url')
        .find('div')
        .css('background-color', 'red');
    globalProcessedLinks.delete(sourceUrl);
    console.log(`Failed to parse JSON for website: ${url} (Source URL: ${sourceUrl})`);
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

    const requirements_to_eliminate = content.existing_source_ids;

    requirements_to_eliminate.forEach(req => {
        // console.log(`Removing requirement with key: ${remainingRequirements[req]}`);
        delete remainingRequirements[req];
    });
}


async function getTexts(links) {

    let validResponses = 0; // Initialize validResponses
    const totalResponses = links.length; // Total number of links to process

    let allData = []

    try {
        responses = await Promise.all(
            links.map(async (link) => {
                const linkArray = JSON.stringify([link]);
                const response = await fetch(`http://localhost:8000/get_link_texts?links=${encodeURIComponent(linkArray)}`);
                const data = await response.json();
                const results = data.results;

                updateActivityLinkColor(results)

                results.forEach(result => {
                    if (result.length !== 0) {
                        validResponses++;
                        allData.push(result);
                        // console.log(`${validResponses}/${totalResponses} responses completed`); // Log the progress
                    }
                });
                return data;
            })
        );
    } catch (error) {
        newActivity('Failed to fetch one or more websites');
        throw error;
    }

    if (allData.length === 0) {
        newActivity(`Couldn't find relevant websites`);
        return;
    }

    newActivity(`Analyzing ${allData.length} ${allData.length > 1 ? 'websites' : 'website'}`);

    const startIndex = Object.keys(sources).length;

    const categorizePromises = [];

    for (let index = 0; index < allData.length; index++) {

        const source = allData[index];
        // console.log(source.url)
        const this_source = {
            url: source.url,
            text: source.text,
            length: source.length
        };
        sources[startIndex + index] = this_source; // Add to sources
        $('.status-option-sources').text(`Sources (${Object.keys(sources).length})`);

        // Push the promise to the array
        categorizePromises.push(categorizeSource(startIndex + index, this_source));
    }

    // Wait for all categorizeSource calls to complete
    await Promise.all(categorizePromises);
    return;
}


function getBaseUrl(url) {
    let baseUrl = url.replace(/^https?:\/\//, '');
    baseUrl = baseUrl.replace(/^www\./, '');
    baseUrl = baseUrl.split('/')[0];
    return baseUrl;
}


