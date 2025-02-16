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



function replaceSourceWithLink(text) {
    return text.replace(/\[SRC_(\d+)\]/g, (match, id) => {
        const source = sources[id];
        return source ? `<a class="text-source" target="_blank" href="${source.url}">${parseInt(id)+1}</a>` : match;
    });
}

function replaceStarsWithStrong(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}


async function beginSearches() {
    setPhase('searching');

    let count = 0;

    // Loop through all sections in the plan
    for (const section of plan) {

        count++;

        if (count !== 1) { newActivity("Continuing to next section"); }

        newActivity('Finding information for: ' + section.section_title)
        $('.current-section').html(`Working on section ${count}/${plan.length}: <span style="color: rgb(168, 168, 168)">${section.section_title}</span>`)

        $('.current-search').show();
        $('.current-search-desc').text(`Researching ${section.section_title}`)
        // $('.current-search-keywords').text(`Searching ${section.search_keywords}...`)
  
        let relevantAndNeededSources = await getRelevantAndNeededSources(section.description, false)

        // console.log(relevantAndNeededSources)

        if (relevantAndNeededSources.required_info_description) {

            const search_term = relevantAndNeededSources.search_term

            if (!search_term || search_term === 'undefined') {
                console.log("Search term was undefined...")
                console.log("relevantAndNeededSources:")
                console.log(relevantAndNeededSources)
            }

            newActivity(`\n\n${relevantAndNeededSources.required_info_description}`)
            newActivity(`Searching phrase: ${relevantAndNeededSources.search_term}`)

            links = await getLinks(search_term)
            links = links.result

            if (links === 429) {
                newActivity('Too many requests to Google search.')
                $('.activity-working').removeClass('activity-working').css('color', '#ff3c3c')
                return;
            } else if (links === 'timeout') {
                newActivity('Getting links timed out, trying again.')
                links = await getLinks(search_term);
                if (links === 429) {
                    newActivity('Too many requests to Google search.');
                    $('.activity-working').removeClass('activity-working').css('color', '#ff3c3c');
                    return;
                }
            }

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
        
            $('.current-search-progress').text('')
            $('.current-search-desc').text('')
            $('.current-search-keywords').text('')
        
        }

        $('.current-search').hide();

        newActivity(`Context validated`)
        newActivity(`Selecting sources`)
        addToModalMessage(`\n\nI'm choosing sources relevant to these requirements: ${section.description}`)

        // add that this only runs if the initial relevantAndNeededSources returned it has enough and didn't need to run. oteherwise checking if we have the relevant sources happens twice  on the same source ocuments data info.
        relevantAndNeededSources = await getRelevantAndNeededSources(section.description, true)

        let required_source_ids = relevantAndNeededSources.source_ids.slice(0, 15).map(id => parseInt(id.split('_')[1])); 

        newActivity(`Using ${required_source_ids.length} sources: ${required_source_ids.sort().join(', ')}`)

        console.log("required_source_ids: ", required_source_ids)

        let sourceTexts = [];
        required_source_ids.forEach(id => {
            // sourceTexts += sources[id].text + ' '
            sourceTexts.push({
                'sourceId': `SRC_${id}`,
                'content': sources[id].text
            })
        });

        console.table(sourceTexts)

        newActivity(`Source text: ${JSON.stringify(sourceTexts).length.toLocaleString()} chars/${JSON.stringify(sourceTexts).split(' ').length.toLocaleString()} words`)
        newActivity("Drafting the section", undefined, undefined, true)

        for (const subsection of section.subsections) {
            newActivity(`Generating content for subsection: ${subsection.subsection_title}`);
    
            const data = await generateSubsectionContentFromSearch(subsection, section, sourceTexts);

            const usage = data.usage || {
                'prompt_tokens': 0,
                'completion_tokens': 0,
                'total': 0
            };
            addTokenUsageToActivity(usage, undefined, latestTimerId());

            if (!finalContent[count-1]) {
                finalContent[count-1] = []; // Initialize as an empty array if undefined
            }
            finalContent[count-1].push({
                'subsection_title': subsection.subsection_title,
                'text': data.choices[0].message.content,
                'tokens': usage
            });
        }

        // await analyzeSearch(JSON.stringify(sourceTexts), section);
    }

    newActivity('Finished the response')
    $('.activity-working').first().removeClass('activity-working').css('color', '#5bfa5b')
    newModelMessageElm()

    const usage ={
        'in': 0,
        'out': 0,
        'total': 0
    }

    plan.forEach((section, index) => {
        addToModalMessage('\n\n\n\n<span class="text-2rem">' + section.section_title + '</span>')
        finalContent[index].forEach(subsection => {
            addToModalMessage('\n\n<span class="text-1.7rem">' + subsection.subsection_title + '</span>')
            addToModalMessage('\n\n<span class="text-1.7rem">' + replaceSourceWithLink(subsection.text) + '</span>')

            usage.in += subsection.tokens.prompt_tokens
            usage.out += subsection.tokens.completion_tokens
        })
    })

    enableBar();
    console.log("Timer before clear:", timer);
    stopTimer(); // Call the stopTimer function
    console.log("Timer after clear:", timer);
    $('.current-section').text('Done, awaiting instructions')

    usage.total += usage.in + usage.out
    $('.token-count').first().text(usage.in.toLocaleString() + ' / ' + usage.out.toLocaleString() + ' / ' + usage.total.toLocaleString() + ' total draft tokens')

    setPhase('done');

}

// }

async function checkIfSourceFulfillsDescription(candidateSources, requiredDescription, localTriedSearchTerms = new Set(), branchHistory = []) {
    
    newActivity('Confirming source data', undefined, undefined, true);
    
    // Use only candidateSources' descriptions for the check
    const candidateSourceDescriptions = Object.values(candidateSources)
        .map(source => source.description)
        .filter(desc => desc && desc.trim().length > 0);
        
    const triedKeywordsArray = Array.from(localTriedSearchTerms);
    
    // Prepare prompt input
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

    addTokenUsageToActivity(data.usage, undefined, latestTimerId());

    const maxBranches = settings.maxBranches

    if (response.fulfills === true || branchHistory.length === maxBranches) {
        if (branchHistory.length === maxBranches) {
            // console.log("Fulfilled by context");
            newActivity("Fulfilled section requirements (max branches hit)");
        } else {
            // console.log("Fulfilled by length timeout")
            newActivity("Fulfilled section requirements by context");
        }

        // console.log("Current history length before remove: ", branchHistory.length)

        if (branchHistory.length !== 0) {
            $('.current-search-nested').last().remove();
            const nestedElements = $('.current-search-nested');
        }
        return true;
    } else {
        const info = response.info;
        // console.log("Missing info:");
        // console.table(info);

        let allFulfilled = true;

        let count = 0;
        
        // Process each missing topic rather than exiting on the first one
        for (let missing_topic of info) {

            count++;
            
            // Log prior missing information and search terms from this branch, if any.

            if (branchHistory.length > 0) {
                // console.log("Prior branch missing information and search terms:");
                branchHistory.forEach(entry => {
                    // console.log(`Missing Information: ${entry.missing_information} | Search Term: ${entry.search_term}`);
                });
            }
            
            // console.log("=== New Search Iteration ===");
            // console.log("Current branch depth:", branchHistory.length + 1);
            // console.log("Missing Information:", missing_topic.missing_information);
            // console.log("Search Term:", missing_topic.search_term);
            // console.log("========================");

            newActivity(`Looking for ${missing_topic.missing_information.charAt(0).toLowerCase() + missing_topic.missing_information.slice(1)}`);
            newActivity(`Searching for: "${missing_topic.search_term}"`);

            // console.log("Branch history length: ", branchHistory.length)

            // Optionally update UI reporting on the current missing info
            if (branchHistory.length !== 0) {
                const $newProgressElm = $(`
                    <div class="current-search-nested">
                        <div class="current-search-progress">Sourcing ${count}/${info.length}</div>
                        <div class="current-search-desc">Researching ${missing_topic.missing_information.charAt(0).toLowerCase() + missing_topic.missing_information.slice(1)}</div>
                        <div class="current-search-keywords">Searching "${missing_topic.search_term}"</div>
                    </div>
                `);
                $('.current-search-keywords').last().html($newProgressElm);
            } else {
                $('.current-search-progress').text(`Sourcing ${count}/${info.length}`)
                $('.current-search-desc').text(`Researching ${missing_topic.missing_information.charAt(0).toLowerCase() + missing_topic.missing_information.slice(1)}`);
                $('.current-search-keywords').text(`Searching "${missing_topic.search_term}"`);
            
            }

            // Merge parent's tried search terms with the current missing topic's search term
            const branchTriedSearchTerms = new Set(localTriedSearchTerms);
            branchTriedSearchTerms.add(missing_topic.search_term);
            
            const currentBranchHistory = [
                ...branchHistory, 
                { missing_information: missing_topic.missing_information, search_term: missing_topic.search_term }
            ];
            
            // Fetch new links and filter out those already processed
            const linksData = await getLinks(missing_topic.search_term);
            if (!Array.isArray(linksData.result)) {
                console.error("Error: linksData.result is not an array:", linksData.result);
                newActivity("Received unexpected data format for links.");
                allFulfilled = false;
                continue;
            }
            let newLinks = linksData.result.filter(link => !globalProcessedLinks.has(link));

            if (newLinks.length === 0) {
                newActivity("No new links found for additional information.");
                allFulfilled = true;
                continue;
            }       
            
            newActivity(`Searching ${newLinks.length} websites.`);
            appendURLS(newLinks);

            const sourcesBeforeKeys = new Set(Object.keys(sources));
            await getTexts(newLinks);
            const newSourceKeys = Object.keys(sources).filter(key => !sourcesBeforeKeys.has(key));
            const newSources = {};
            newSourceKeys.forEach(key => {
                newSources[key] = sources[key];
            });

            // Recursively check the sources for the current missing topic
            const fulfilled = await checkIfSourceFulfillsDescription(
                newSources,
                missing_topic.missing_information,
                branchTriedSearchTerms,
                currentBranchHistory
            );

            if (!fulfilled) {
                allFulfilled = false;
            }
        }
        
        $('.current-search-nested').last().remove();
        return allFulfilled;
    }
}



async function getRelevantAndNeededSources(sectionDescription, sources_only) {

    newActivity('Examining current context', undefined, undefined, true)

    let sourceDescriptions = {}
    for (const [key, value] of Object.entries(sources)) {
        sourceDescriptions[`SRC_${key}`] = value.description;
    }

    let prompt;
    if (sources_only) {
        prompt = selectOnlySourcesPrompt;
    } else if (!sources_only && Object.keys(sources).length > 0) {
        prompt = getSelectSourcesPrompt()
    } else if (!sources_only && Object.keys(sources).length === 0) {
        prompt = generateMissingInfoPrompt;
    }

    const messages_payload = [
        { role: "system", content: prompt },
        { role: "user", content: `
            description: ${sectionDescription}
            sources: ${JSON.stringify(sourceDescriptions)}
        ` }
    ];

    const data = await sendRequestToDecoder(messages_payload);
    addTokenUsageToActivity(data.usage, undefined, latestTimerId())
    let content;
    try {
        content = data.choices[0].message.content;
        content = JSON.parse(content);
    } catch (e) {
        console.error("Error parsing decoder response:", e);
        console.log("Response content:", content);
        newActivity('Error getting relevant and needed sources')
        throw e;
    }
    return content;
}


function sendRequestToDecoder(messages_payload, { signal, max_tokens, do_stream = false } = {}) {
    return new Promise((resolve, reject) => {
        let payload = {
            model: decoderModelId,
            temperature: 0.7,
            top_p: 0.9,
            messages: messages_payload,
            max_tokens: max_tokens || 8192,
            stream: do_stream
        };

        fetch(decoderBase, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${decoderKey}`
            },
            body: JSON.stringify(payload),
            signal // Add the AbortController signal here
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 429) {
                    // Keep existing rate limit handling
                }

                return response.text().then(text => {
                    newActivity(`Received error: ${response.status}`);
                    newActivity(`Response body: ${text}`);
                    throw new Error(`HTTP error! status: ${response.status}`);
                });
            }

            if (do_stream) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder("utf-8");
                let result = '';
                let buffer = '';
                let usage = null;
                let hasResolved = false;

                // Add signal handling for streaming
                if (signal) {
                    signal.addEventListener('abort', () => {
                        reader.cancel();
                        if (!hasResolved) {
                            hasResolved = true;
                            reject(new Error('Request aborted'));
                        }
                    });
                }

                function read() {
                    return reader.read().then(({ done, value }) => {
                        if (done) {
                            if (!hasResolved) {
                                hasResolved = true;
                                resolve({
                                    choices: [{
                                        message: {
                                            content: result
                                        }
                                    }],
                                    usage: usage
                                });
                            }
                            return;
                        }

                        // Rest of your existing streaming logic remains the same
                        const chunk = decoder.decode(value, { stream: true });
                        buffer += chunk;
                        
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';
                        
                        for (const line of lines) {
                            if (line.trim() === '' || !line.startsWith('data: ')) continue;

                            try {
                                const jsonString = line.slice(6);
                                
                                if (jsonString === '[DONE]') {
                                    if (!hasResolved) {
                                        hasResolved = true;
                                        resolve({
                                            choices: [{
                                                message: {
                                                    content: result
                                                }
                                            }],
                                            usage: usage
                                        });
                                    }
                                    return;
                                }

                                const data = JSON.parse(jsonString);

                                if (data.usage) {
                                    usage = data.usage;
                                }

                                if (data.choices?.[0]?.delta?.content) {
                                    const contentChunk = data.choices[0].delta.content;
                                    result += contentChunk;
                                    addToModalMessage(contentChunk);
                                    const updatedResult = replaceSourceWithLink(result);
                                    updateModalContent(updatedResult);
                                }
                            } catch (error) {
                                console.error('Failed to parse chunk:', error);
                                console.error('Problematic line:', line);
                            }
                        }

                        return read();
                    }).catch(error => {
                        console.error('Stream reading error:', error);
                        if (!hasResolved) {
                            hasResolved = true;
                            reject(error);
                        }
                    });
                }

                return read();
            }

            // Non-streaming response handling
            return response.json().then(response_json => {
                if (!response_json?.choices?.length) {
                    console.error("Invalid response format:", response_json);
                    throw new Error("Invalid response format");
                }

                response_json.choices[0].message.content = 
                    response_json.choices[0].message.content
                        .replace('```json', '')
                        .replace('```', '');
                        
                resolve(response_json);
            });
        })
        .catch(error => {
            if (error.name === 'AbortError') {
                reject(new Error('Request timed out'));
            } else {
                console.error('Error:', error);
                reject(error);
            }
        });
    });
}

async function generateSubsectionContentFromSearch(subsection, section, sourceTexts) {
    const subsectionContentInput = {
        SUBSECTION_TITLE: subsection.subsection_title,
        SUBSECTION_CONTENT_REQUIREMENTS: subsection.subsection_content_requirements,
        SOURCE_TEXTS: sourceTexts, // Pass source texts
        SECTION_TITLE: section.section_title, // Include section title for context
        SECTION_DESCRIPTION: section.description // Include section description for context
    };

    const subsectionContentPayload = [
        { role: "system", content: generateSubsectionContentFromSearchPrompt },
        { role: "user", content: JSON.stringify(subsectionContentInput) },
        { role: "assistant", content: "" }
    ];

    try {
        addToModalMessage(`\n\nDrafting subsection "${subsection.subsection_title}":`);

        const data = await sendRequestToDecoder(subsectionContentPayload, undefined, true); // Use sendRequestToDecoder

        if (!data.choices || data.choices.length === 0) {
            console.error("Error: data.choices is undefined or empty", data);
            newActivity(`Failed to draft subsection: ${subsection.subsection_title}`);
            return null; // Or handle the error as needed
        }

        const content = data.choices[0].message.content;
        subsection.subsection_content = content; // Store directly in subsection
        newActivity(`Drafted subsection: ${subsection.subsection_title}`);
        addToModalMessage('\n\n' + replaceSourceWithLink(content))

        return data; // Return the generated content (optional)

    } catch (error) {
        console.error("Error generating subsection content:", error);
        newActivity(`Failed to draft subsection: ${subsection.subsection_title}: ${error.message}`);
        return null; // Or handle the error as needed
    }
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
            The source materials are defined as follows:
            ${JSON.stringify(searchData, null, 2)}
        ` }
    ];

    newModelMessageElm(true)
    addToModalMessage('Drafting ' + section_title + '...\n\n')
    const data = await sendRequestToDecoder(messages_payload, undefined, true);
    const content = data.choices[0].message.content;
    const usage = data.usage || {
        'prompt_tokens': 0,
        'out': 0,
        'total': 0
    };
    
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
    // newActivity('Drafted the section');
    addTokenUsageToActivity(usage, undefined, latestTimerId());
    // add logic to confirm and refine the draft here!

}


function getLinks(keywords) {
    return new Promise((resolve, reject) => {
        fetch(`http://localhost:${port}/get_links?keywords=${encodeURIComponent(keywords)}`)
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
    const url = getBaseUrl(source.url);

    newActivity(`Understanding ${url}`, source.url, undefined, true);
    const messages_payload = [
        { role: "system", content: categorizeSourcePrompt },
        { role: "user", content: `
            The text body is: ${source.text}
        ` }
    ];

    try {
        const timerId = $(`.token-count[data-activity-url="${source.url}"]`).attr('data-timer-id');
        
        // Create a unique timeout controller for each request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, 30000);

        try {
            const data = await sendRequestToDecoder(messages_payload, { signal: controller.signal });
            clearTimeout(timeoutId); // Clear timeout on success

            addTokenUsageToActivity(data.usage, source.url, timerId);

            if (data) {
                let content = JSON.parse(data.choices[0].message.content);
                addToModalMessage(`\n\n${url} contains ${content.description.charAt(0).toLowerCase() + content.description.slice(1)}`);
                sources[index]['description'] = content.description;
                $('.sources-count').text(Object.keys(sources).length + ' sources');
                $(`.source[href="${source.url}"]`).find('.source-description').text(content.description).hide();
                
                $(`.source[href="${source.url}"]`).on('mousedown', function(event) {
                    if (event.shiftKey) {
                        window.open(source.url, '_blank', 'noopener,noreferrer');
                    } else {
                        const $description = $(this).find('.source-description');
                        if (!$description.is(':visible')) {
                            $description.slideDown('fast');
                            $(this).addClass('desc-shown');
                        }
                    }
                })
                .on('mouseup', function() {
                    const $description = $(this).find('.source-description');
                    if (!window.getSelection().toString() && $description.is(':visible') && !$description.is(':animated')) {
                        $description.slideUp('fast');
                        $(this).removeClass('desc-shown');
                    }
                });

                return content.description;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                handleError(source.url, url, "Request timed out");
            } else {
                handleError(source.url, url, error.message || "Request failed");
            }

            $(`.token-count[data-activity-url="${source.url}"]:not(.activity-error)`).first().parent().find('.activity-header').removeClass('activity-understanding');
            throw error;
        } finally {
            clearTimeout(timeoutId); // Ensure timeout is cleared in all cases
        }
    } catch (error) {
        console.error('Error occurred:', error);
        handleError(source.url, url, error.message || "Unknown error");
    }
}

function handleError(sourceUrl, url, errorType) {
    console.error(`${errorType} for website: ${url} (Source URL: ${sourceUrl})`);
    $(`div.activity-errors[data-activity-link-url="${sourceUrl}"]`)
        .removeAttr('data-activity-link-url')
        .text(errorType);
    $(`div.activity-link-status[data-activity-link-url="${sourceUrl}"] > div`)
        .parent()
        .removeAttr('data-activity-link-url')
        .find('div')
        .css('background-color', 'red');
    globalProcessedLinks.delete(sourceUrl);
}

async function getTexts(links) {
    let validResponses = 0;
    let allData = [];

    try {
        const responses = await Promise.allSettled(
            links.map(async (link) => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                try {
                    // Simplified fetch request that won't trigger preflight
                    const response = await fetch(
                        `http://localhost:8000/get_link_texts?links=${encodeURIComponent(JSON.stringify([link]))}`,
                        {
                            signal: controller.signal,
                            // Removed Content-Type header to avoid preflight
                        }
                    );

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();
                    // Rest of the processing remains the same
                    const results = data.results;

                    updateActivityLinkColor(results);

                    results.forEach(result => {
                        if (result.length !== 0) {
                            validResponses++;
                            allData.push(result);
                            
                            const $sourceElm = $(`<div class="source flex flex-col" href="${link}" target="_blank">
                                <div class="source-title">${result.title}</div>
                                <div class="source-url">${getBaseUrl(link)}</div>
                                <div class="source-length">${result.length.toLocaleString()} chars /
                                    ${result.text.split(/\s+/).length.toLocaleString()} words</div>
                                <div class="source-description">Analyzing...</div>
                            </div>`);

                            $('.sources').children().first().after($sourceElm);
                        }
                    });
                    return { link, data };

                } catch (error) {
                    if (error.name === 'AbortError') {
                        handleError(link, getBaseUrl(link), "Request timed out");
                    } else {
                        handleError(link, getBaseUrl(link), error.message || "Failed to fetch");
                    }
                    throw error;
                } finally {
                    clearTimeout(timeoutId);
                }
            })
        );

        // Handle the results
        responses.forEach(response => {
            if (response.status === 'rejected') {
                console.error('Request failed:', response.reason);
            }
        });

    } catch (error) {
        newActivity('Failed to fetch one or more websites');
        console.error('Fatal error in getTexts:', error);
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
        const this_source = {
            url: source.url,
            text: source.text,
            length: source.length
        };
        sources[startIndex + index] = this_source;

        categorizePromises.push(categorizeSource(startIndex + index, this_source));
    }

    // Wait for all categorizeSource calls to complete, handling any errors
    try {
        await Promise.allSettled(categorizePromises);
    } catch (error) {
        console.error('Error during categorization:', error);
        newActivity('Error during website analysis');
    }

    return;
}


function getBaseUrl(url) {
    let baseUrl = url.replace(/^https?:\/\//, '');
    baseUrl = baseUrl.replace(/^www\./, '');
    baseUrl = baseUrl.split('/')[0];
    return baseUrl;
}


