const defaultSettings = {
    'braveKey': null,
    'reasoningModelId': '',
    'reasoningBase': null,
    'reasoningKey': null,
    'statsEnabled': true,
    'maxBranches': 2,
    'maxSources': 5,

    'selectedDecoderModelId': '1',

    'allKeySettings': {
        '1': {
            'decoderModelId': '',
            'decoderBase': '',
            'decoderKey': '',
        }
    }
}

let settings = {}
let decoderModelId, decoderBase, decoderKey
let braveKey

function populateInputs(isInitial) {
    Object.keys(settings.allKeySettings).forEach((modelId, index) => {
        if (isInitial && modelId !== '1') {
            createModelClone();
        }
        const modelValues = settings.allKeySettings[modelId];
        const modelElement = $(`[data-model="${modelId}"]`);
        for (const key in modelValues) {
            modelElement.find(`.api-key-input[data-key="${key}"]`).val(modelValues[key]);
        }
        if (modelId !== '1') {
            modelElement.find('.delete-model-button').css('visibility', 'visible');
        }
    });
    $('#max-sources').val(settings.maxSources);
}

function confirmSettings(elm) {

    const modelId = $(elm).closest('[data-model]').attr('data-model');
    const apiKeyInputs = $(`[data-model="${modelId}"]`).find('.api-key-input');
    
    // console.log(apiKeyInputs)

    let modelValues = {};

    apiKeyInputs.each(function() {
        const inputKey = $(this).data('key');
        const value = $(this).val();
        if (inputKey) {
            console.log(`Saving ${inputKey}: ${value} for model #: ${modelId}`);
            modelValues[inputKey] = value;
        }
    });

    settings.allKeySettings[modelId] = modelValues;
    localStorage.setItem('settings', JSON.stringify(settings));

    $('.saved-message').text("Saved!").slideDown('fast');
    setTimeout(function() {
        $('.saved-message').slideUp('fast');
    }, 3000);

    if ($(`[data-model="${modelId}"]`).find('.decoder-bullet').hasClass('bullet-selected')) {
        selectModel(modelId)
    }

}

const providerMap = {
    'openai': 'OpenAI',
    'googleapis': 'Google',
    'anthropic': 'Anthropic',
    'deepinfra': 'DeepInfra',
    'sambanova': 'SambaNova',
    'azure': 'Azure',
    'fireworks': 'Fireworks AI',
    'github': 'GitHub AI',
    'groq': 'Groq',
    'hyperbolic': 'Hyperbolic',
    'mistral': 'Mistral',
    'openrouter': 'OpenRouter',
    'together': 'Together AI'
}

function getProvider() {
    let url = decoderBase;
    const urlPattern = /^(?:https?:\/\/)?(?:www\.)?([^\/:]+)(?::\d+)?(?:\/.*)?$/;
    const match = url.match(urlPattern);
    
    if (match && match[1]) {
        const domain = match[1];
        
        if (domain === 'localhost') {
            const portPattern = /:\d+/;
            const portMatch = url.match(portPattern);
            const port = portMatch ? portMatch[0] : '';
            return `localhost${port}`;
        }
        
        const domainParts = domain.split('.');
        if (domainParts.length >= 2) {
            const mainDomain = domainParts[domainParts.length - 2];
            if (mainDomain in providerMap) {
                return providerMap[mainDomain];
            }
            return mainDomain;
        }
    }
    
    return url;
}

function setGlobalSelectedModelVars() {

    let selectedModelId = settings['selectedDecoderModelId']

    if (!settings.allKeySettings[selectedModelId]) {
        selectedModelId = 1;
        settings.selectedDecoderModelId = 1
        localStorage.setItem('setting', JSON.stringify(settings))
    }

    decoderModelId = settings.allKeySettings[selectedModelId].decoderModelId
    decoderBase = settings.allKeySettings[selectedModelId].decoderBase
    decoderKey = settings.allKeySettings[selectedModelId].decoderKey

    $('.model-name').html(decoderModelId + '<br>' + getProvider())

}

let modelSelectionTimeout;
function modelSelectionPopup() {
    clearTimeout(modelSelectionTimeout);
    $('.saved-message').show().text(`Selected model ${decoderModelId}!`);
    modelSelectionTimeout = setTimeout(function() {
        $('.saved-message').slideUp('fast');
    }, 3000);
}

$(document).ready(function() {
    if (!localStorage.getItem('settings')) {
        localStorage.setItem('settings', JSON.stringify(defaultSettings));
    }
    settings = JSON.parse(localStorage.getItem('settings'));

    maxBranches = settings.maxBranches;

    $('#stats-toggle').prop('checked', settings.statsEnabled || false);
    if (settings.statsEnabled) {
        $('.overall-tokens').show();
    }

    const maxBranchesValue = settings.maxBranches;
    $('.dropdown-selected').text(maxBranchesValue); 
    $(`.dropdown-option[data-value="${maxBranchesValue}"]`).addClass('selected');

    $('.decoder-bullet-wrapper').click(function() {
        selectModel(1);
        modelSelectionPopup();
    });

    setGlobalSelectedModelVars(settings['selectedDecoderModelId']);
    populateInputs(true);
    selectModel(settings['selectedDecoderModelId']);

    $('.confirm-button').on('click', function() {
        confirmSettings($(this));
    });

    $('#stats-toggle').change(function() {
        const isChecked = $(this).is(':checked');
        settings.statsEnabled = isChecked;
        localStorage.setItem('settings', JSON.stringify(settings));
        
        if (isChecked) {
            $('.overall-tokens').show();
        } else {
            $('.overall-tokens').hide();
        }
    });

    $('.dropdown-selected').on('click', function() {
        $(this).siblings('.dropdown-options').toggle(); 
    });

    $('.dropdown-option').on('click', function() {
        const selectedValue = $(this).text(); 
        $(this).closest('.dropdown').find('.dropdown-selected').text(selectedValue);
        $(this).closest('.dropdown-options').hide();

        settings.maxBranches = parseInt($(this).data('value')); 
        localStorage.setItem('settings', JSON.stringify(settings));
    });

    $(document).on('click', function(event) {
        if (!$(event.target).closest('.dropdown').length) {
            $('.dropdown-options').hide();
        }
    });

    let lastValidValue = 10;

    $('#max-sources').on('input', function() {
        this.value = this.value.replace(/[^0-9]/g, ''); // Remove non-numeric characters
        const value = parseInt(this.value);

        // Check if the value is valid (between 10 and 20)
        if (this.value !== '' && (value < 10 || value > 20)) {
            $(this).addClass('error'); // Add error class if invalid
        } else {
            $(this).removeClass('error'); // Remove error class if valid
            if (!isNaN(value)) {
                lastValidValue = value; // Update last valid value
                settings.maxSources = value; // Update settings
                localStorage.setItem('settings', JSON.stringify(settings)); // Save to local storage
            }
        }
    });
    
    $('#save-max-sources').click(function(event) {

        const maxSourcesValue = $('#max-sources').val();
        const savedMessage = $('.saved-message');

        if (maxSourcesValue >= 5 && maxSourcesValue <= 10) {
            settings.maxSources = parseInt(maxSourcesValue);
            localStorage.setItem('settings', JSON.stringify(settings));

            savedMessage.text('Max sources saved successfully!').css('background-color', '#28b128').css('color', 'white').slideDown('fast');

            setTimeout(function() {
                savedMessage.slideUp('fast').css('background-color', '#28b128');
            }, 2000);
        } else {
            savedMessage.text('Please enter a value between 10 and 20.').css('background-color', 'red').css('color', 'white').slideDown('fast');

            setTimeout(function() {
                savedMessage.slideUp('fast');
            }, 2000);
        }
    });

    $(document).on('click', '.delete-model-button', function() {
        const modelId = $(this).closest('[data-model]').attr('data-model');
        deleteModel(modelId);
    });
})

$(document).keydown(function(event) {
    if (event.key === "Escape") {
        $('.settings-wrapper').scrollTop(0).hide();
        $('.base-presets').hide();
    }
    else if (event.key === "S" || event.key === "s") {
        if ($(document.activeElement).is('textarea')) return
        if ($('.settings-wrapper').is(':visible') && !$(document.activeElement).is('input')) {
            $('.settings-wrapper').scrollTop(0).hide();
        } else if (!$(document.activeElement).is('input')) {
            $('.settings-wrapper').show();
            populateInputs();
        }
    }
    else if (event.key === "u" || event.key === "U") {
        if ($(document.activeElement).is('textarea')) return
        $('#stats-toggle').prop('checked', function(i, value) {
            return !value;
        }).change();
    }
});

$('input[data-key="decoderBase"]').click(function() {
    $('.base-presets').hide();
    if ($(this).val() !== '') {
        return;
    }
    $(this).next('.base-presets').slideDown(100);
})

$('input[data-key="decoderBase"]').on('input', function() {
    $('.base-presets').slideUp('fast');
})

$('.settings-wrapper').click(function(event) {
    if ($(event.target).data('key') !== 'decoderBase') {
        $('.base-presets').slideUp('fast');
    }
})

$('div[data-base]').click(function() {
    $(this).closest('.base-presets').prev().val($(this).attr('data-base'))
    $('.base-presets').slideUp('fast');
})

function selectModel(modelNum) {
    console.log("Selecting saved deocder modelId: ", modelNum)
    settings['selectedDecoderModelId'] = modelNum
    localStorage.setItem('settings', JSON.stringify(settings))
    $('.bullet-selected').removeClass('bullet-selected')
    $(`[data-model="${modelNum}"]`).find('.decoder-bullet').addClass('bullet-selected')

    setGlobalSelectedModelVars(modelNum)
}
function deleteModel(modelId) {
    if (modelId === '1') {
        return;
    }
    
    console.log("Deleting model ID:", modelId);
    console.log("Before deletion, all models:", Object.keys(settings.allKeySettings));
    
    const higherModelElements = [];
    const modelIdNum = parseInt(modelId);
    const allModelIds = Object.keys(settings.allKeySettings).map(id => parseInt(id)).sort((a, b) => a - b);
    
    for (let i = modelIdNum + 1; i <= Math.max(...allModelIds); i++) {
        const $element = $(`[data-model="${i}"]`);
        if ($element.length) {
            const modelValues = {};
            $element.find('.api-key-input').each(function() {
                const key = $(this).data('key');
                const value = $(this).val();
                modelValues[key] = value;
            });
            
            higherModelElements.push({
                id: i,
                values: modelValues,
                selected: $element.find('.decoder-bullet').hasClass('bullet-selected')
            });
        }
    }
    
    console.log("Higher model elements to preserve:", higherModelElements);
    
    delete settings.allKeySettings[modelId];
    
    $(`[data-model="${modelId}"]`).remove();
    
    higherModelElements.forEach(model => {
        const oldId = model.id;
        const newId = oldId - 1;
        
        settings.allKeySettings[newId] = settings.allKeySettings[oldId] || model.values;
        delete settings.allKeySettings[oldId];
        
        const $element = $(`[data-model="${oldId}"]`);
        if ($element.length) {
            $element.attr('data-model', newId);
            $element.find('.decoder-bullet-wrapper')
                .attr('data-model', newId)
                .off('click')
                .click(function() {
                    selectModel(newId);
                    modelSelectionPopup();
                });
                
            if (model.selected) {
                selectModel(newId);
            }
        }
    });
    
    if (settings.selectedDecoderModelId == modelId) {
        selectModel('1');
    } else if (parseInt(settings.selectedDecoderModelId) > modelIdNum) {
        selectModel(parseInt(settings.selectedDecoderModelId) - 1);
    }
    
    localStorage.setItem('settings', JSON.stringify(settings));
    
    console.log("After deletion, all models:", Object.keys(settings.allKeySettings));
    
    $('.saved-message').text("Model deleted!").slideDown('fast');
    setTimeout(function() {
        $('.saved-message').slideUp('fast');
    }, 3000);
}

function createModelClone() {
    const $clone = $('.decoder-template').clone().find('input').val('').end();
    $clone.removeClass('decoder-template');
    $clone.find('.api-key-label').remove();
    $clone.find('.bullet-selected').removeClass('bullet-selected');
    $clone.find('input[data-key="decoderBase"]').click(function() {
        $('.base-presets').hide();
        if ($(this).val() !== '') {
            return;
        }
        $(this).next('.base-presets').slideDown(100);
    });
    $clone.find('.confirm-button').click(function() {
        confirmSettings($(this));
    });

    const modelNum = $('.preset-base-title').length + 1;
    $clone.attr('data-model', modelNum);
    $clone.find('.decoder-bullet-wrapper').attr('data-model', modelNum).click(function() {
        selectModel(modelNum)
        modelSelectionPopup();
    })

    $clone.find('div[data-base]').click(function() {
        $(this).closest('.base-presets').prev().val($(this).attr('data-base'))
        $('.base-presets').slideUp('fast');
    })
    
    $clone.find('.delete-model-button').css('visibility', 'visible')

    $('.decoder-template').parent().children().last().before($clone);
}

$('.add-model').click(function() {
    createModelClone();
})