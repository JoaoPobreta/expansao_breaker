(function () {
    'use strict';

    // Altera o conteúdo do botão principal
    const nextButton = document.querySelector('a.task-actions-button-next');
    if (nextButton) {
        const text = 'vao se fudere | made by marcos10pc | discord.gg/platformdestroyer | se você pagou por isso, foi scamado';
        nextButton.textContent = atob('dmFvIHNlIGZ1ZGVyZW0gfCBtYWRlIGJ5IG1hcmNvczEwcGMgfCBkaXNjb3JkLmdnL3BsYXRmb3JtZGVzdHJveWVyIHwgc2Ugdm9jw6ogcGFnb3UgcG9yIGlzc28sIGZvaSBzY2FtbWFkbw==');
    }

    const currentUrl = window.location.href;
    const submitButton = document.getElementsByClassName('task-actions-button')[0];
    if (submitButton) {
        // Marcar todas alternativas corretas (checkbox)
        const checkboxes = document.querySelectorAll('li[data-correct="true"] input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) checkbox.click();
        });

        // Marcar alternativas corretas (radio)
        const radios = document.querySelectorAll('.alternativeList-item[data-correct="true"] input[type="radio"]');
        radios.forEach(radio => radio.click());

        // Clicar no botão de próxima etapa se existir
        const bootcampNext = document.getElementsByClassName('bootcamp-next-button')[0];
        if (bootcampNext) bootcampNext.click();

        // Marcar transcrição
        const transcription = document.querySelector('form[data-gtm-form-interact-id="0"]');
        if (transcription) transcription.click();

        // Se for uma tarefa de projeto (section)
        const projectLink = document.querySelector('.project-link');
        if (projectLink) {
            const projectHref = projectLink.getAttribute('href');
            const parts = currentUrl.split('/');
            const courseId = parts[4];
            const taskId = parts[parts.length - 1];

            let sectionId = '';
            const small = document.querySelector('.task-body-header-title small');
            if (small) {
                sectionId = small.textContent.trim();
                if (sectionId.startsWith('0')) sectionId = sectionId.substring(1);
            }

            const apiUrl = `https://cursos.alura.com.br/course/${courseId}/section/${sectionId}/linksubmit/answer`;

            const payload = {
                taskId: Number(taskId),
                alternatives: [],
                linkUrl: 'https://github.com/undefined/' // Fake link para manter a porcentagem
            };

            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            alert('Uh, Infelizmente no momento o alura destroyer não envia link de projetos, você esta sozinho nessa lil bro 💀 | um link em branco foi enviado no lugar para manter a porcentagem de 100%');
        }

        setTimeout(() => {
            submitButton.click();
        }, 5000);
    }
})();
