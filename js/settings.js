const maxBranches = 0;

const defaultSettings = {
    'braveKey': null,
    'reasoningModelId': '',
    'reasoningBase': null,
    'reasoningKey': null,
    'statsEnabled': true,

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

    // Loop through allKeySettings and populate inputs for each model using index
    Object.keys(settings.allKeySettings).forEach((modelId, index) => {
        if (isInitial && modelId !== '1') {
            createModelClone();
        }
        const modelValues = settings.allKeySettings[modelId];
        const modelElement = $(`[data-model="${modelId}"]`); // Select the parent element with data-model=modelId
        for (const key in modelValues) {
            modelElement.find(`.api-key-input[data-key="${key}"]`).val(modelValues[key]); // Find inputs within the model element
        }
    });
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
    'anthrophic': 'Anthropic',
    'deepinfra': 'DeepInfra',
    'sambanova': 'SambaNova'
}

function getProvider() {
    let url = decoderBase;
    const urlPattern = /^(?:https?:\/\/)?(?:www\.)?([^\/]+)(?:\/.*)?$/;
    const match = url.match(urlPattern);
    if (match && match[1]) {
        url = match[1].split('.').slice(1, -1).join('.'); // Extracts everything except the last part of the domain
        if (url in providerMap) {
            url = providerMap[url]
        }
        return url;
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

    $('.model-name').html(decoderModelId.replaceAll('-', ' ') + '<br>on ' + getProvider())

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

    // Set initial state of toggle based on saved settings
    $('#stats-toggle').prop('checked', settings.statsEnabled || false);
    if (settings.statsEnabled) {
        $('.overall-tokens').show();
    }

    $('.decoder-bullet-wrapper').click(function() { // set event on initial element since other event handlers for others are added when cloned
        selectModel(1)
        modelSelectionPopup();
    })

    setGlobalSelectedModelVars(settings['selectedDecoderModelId'])
    populateInputs(true);
    selectModel(settings['selectedDecoderModelId'])

    $('.confirm-button').on('click', function() {
        confirmSettings($(this))
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

    $('.decoder-template').parent().children().last().before($clone);
}

$('.add-model').click(function() {
    createModelClone();
})