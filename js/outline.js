function addPlanToOutline() {

    plan.forEach((section, index) => {
        
        const $outlineSection = $(`
        <div class="flex flex-col gap-y-1rem">
            
            <div class="flex">
                <div class="section-dropdown flex items-center">▼ </div>
                <div class="outline-section-title">${section.section_title}</div>
            </div>

            <div class="outline-section-keywords none">${section.search_keywords}</div>
            <div class="outline-section-desc none" data-outline-section=${index}>${section.description}</div>
            
        </div>`)

        $outlineSection.click(function() {
            const $desc = $(this).closest('.flex-col').find('.outline-section-desc');
            const $dropdown = $(this).find('.section-dropdown');
            if ($desc.is(':visible')) {
                $desc.slideUp();
                $dropdown.text('▼ ');
            } else {
                $desc.slideDown();
                $dropdown.text('▲ ');
            }
        })
        .hover(function() {
            $(this).find('.section-dropdown').css('color', '#444dbf')
            $(this).find('.outline-section-title').css('color', '#a3a3a3')
        })
        .mouseleave(function() {
            $(this).find('.section-dropdown').css('color', 'rgb(131, 135, 192)');
            $(this).find('.outline-section-title').css('color', '#f1f1f1');
        })

        $('.outline').append($outlineSection)

    });

}