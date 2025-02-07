// Global variables to accumulate texts and track processed links
let globalSourceTexts = "";
let globalProcessedLinks = new Set();

async function beginSearches() {
    newActivity('Getting relevant links');
    setPhase('findingLinks');
    
    const section = plan[0];

    let linksData = await getLinks(section.search_keywords);
    let links = linksData.result;
    console.log(links);

    newActivity(`Searching ${links.length} links`);

    // Append each link to the UI and mark it as processed
    links.forEach(link => {
        console.log(link);
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
    setPhase('fetchingLinks');

    // Fetch texts for the initial links
    const textsData = await getTexts(links);

    // while (!isEmpty(remainingRequirements)) {
    // }

    // Build the text string only for this iteration
    let initialSourceText = "";
    textsData.result.forEach(result => {
        initialSourceText += result.text;
    });

    console.log('Initial search text: ', initialSourceText);
    newActivity(`Analyzing ${textsData.result.length} links`);

    // Begin checking using only the texts from this search iteration
    globalSourceTexts += initialSourceText
    checkIfEnoughContext(section, initialSourceText);
}


async function checkIfEnoughContext(section, currentSourceText) {
    console.log('Checking context using current search text:', currentSourceText);

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

        // Append new links to the UI and mark them as processed
        newLinks.forEach(link => {
            console.log(link);
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
        console.log(description)
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


