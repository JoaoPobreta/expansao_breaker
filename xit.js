async function marcarPaginaComoConcluida(id) {
    try {
        await fetch(`https://expansao.educacao.sp.gov.br/mod/resource/view.php?id=${id}`, {
            credentials: 'include',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'same-origin'
            },
            method: 'GET',
            mode: 'cors'
        });
    } catch (e) { }
}

async function do_exam(link) {
    if (!link) return;
    let cmid = '';
    try {
        const url = new URL(link);
        cmid = url.searchParams.get('id');
    } catch { }

    function matchGroup(text, regex, error) {
        const match = text.match(regex);
        if (!match || !match[1]) throw new Error(error);
        return match[1];
    }

    async function getSessKeyAndHtml() {
        const res = await fetch(link, { method: 'GET', credentials: 'include' });
        if (!res.ok) throw new Error('Erro: ' + res.status);
        const html = await res.text();
        if (!cmid) {
            try { cmid = matchGroup(html, /contextInstanceId":(\d+)/, 'CMID não encontrado'); } catch { }
        }
        const sesskey = matchGroup(html, /sesskey":"([^"]+)/, 'Sesskey não encontrado');
        return { sesskey, html };
    }

    async function startAttempt(cmid, sesskey) {
        const body = new URLSearchParams();
        body.append('cmid', cmid);
        body.append('sesskey', sesskey);

        const res = await fetch('https://expansao.educacao.sp.gov.br/mod/quiz/startattempt.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            redirect: 'follow'
        });

        if (!res.ok) throw new Error('Erro: ' + res.status);
        const redirectUrl = res.url;
        const attemptId = (redirectUrl.match(/attempt=(\d+)/) || [])[1];
        if (!attemptId) throw new Error('ID da tentativa não encontrado');
        return { redirectUrl, attemptId };
    }

    async function getQuestionInfo(redirectUrl) {
        const res = await fetch(redirectUrl, { method: 'GET', credentials: 'include' });
        if (!res.ok) throw new Error('Erro: ' + res.status);
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const data = {
            questId: null,
            seqCheck: null,
            options: [],
            attempt: null,
            sesskey: null,
            formFields: {}
        };

        doc.querySelectorAll('input[type="hidden"]').forEach(input => {
            const name = input.getAttribute('name');
            const value = input.getAttribute('value');
            if (name && name.includes(':sequencecheck')) {
                data.questId = name.split(':')[0];
                data.seqCheck = value;
            } else if (name === 'attempt') {
                data.attempt = value;
            } else if (name === 'sesskey') {
                data.sesskey = value;
            } else if (name && ['slots', 'scrollpos', 'timeup', 'thispage', 'nextpage'].includes(name)) {
                data.formFields[name] = value;
            }
        });

        doc.querySelectorAll('input[type="radio"]').forEach(input => {
            const name = input.getAttribute('name');
            const value = input.getAttribute('value');
            if (name && name.includes('_answer') && value !== '-1') {
                data.options.push({ name, value });
            }
        });

        if (!data.questId || !data.attempt || !data.sesskey || data.options.length === 0)
            throw new Error('Informações insuficientes na página da questão');

        return data;
    }

    async function submitAnswer(question, cmid) {
        const randomIndex = Math.floor(Math.random() * question.options.length);
        const choice = question.options[randomIndex];
        const formData = new FormData();
        formData.append(question.questId + ':flagged', '0');
        formData.append(question.questId + ':answered', '0');
        formData.append(question.questId + ':1_:sequencecheck', question.seqCheck);
        formData.append(choice.name, choice.value);
        formData.append('slots', '1');
        formData.append('attempt', question.attempt);
        Object.entries(question.formFields).forEach(([key, val]) => formData.append(key, val));
        formData.append('sesskey', question.sesskey);
        formData.append('nextpage', '1');

        const res = await fetch(`https://expansao.educacao.sp.gov.br/mod/quiz/processattempt.php?cmid=${cmid}`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
            redirect: 'follow'
        });

        if (!res.ok) throw new Error('Erro: ' + res.status);
        return { redirectUrl: res.url, attemptId: question.attempt, sesskey: question.sesskey };
    }

    async function finishAttempt(attemptId, cmid, sesskey) {
        const params = new URLSearchParams();
        params.append('attempt', attemptId);
        params.append('finishattempt', '1');
        params.append('timeup', '0');
        params.append('slots', '');
        params.append('cmid', cmid);
        params.append('sesskey', sesskey);

        const res = await fetch('https://expansao.educacao.sp.gov.br/mod/quiz/processattempt.php', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
            redirect: 'follow'
        });

        if (!res.ok) throw new Error('Erro: ' + res.status);
        return await res.text();
    }

    try {
        const { sesskey } = await getSessKeyAndHtml();
        const { redirectUrl, attemptId } = await startAttempt(cmid, sesskey);
        const question = await getQuestionInfo(redirectUrl);
        const { attemptId: aid, sesskey: sess } = await submitAnswer(question, cmid);
        await finishAttempt(aid, cmid, sess);
    } catch (e) { }
}

async function verificarPaginas() {
    alert('Atividades como concluídas...');
    const atividades = document.querySelectorAll('li.activity');
    const concluidas = [];
    const quizzes = [];

    atividades.forEach(li => {
        const link = li.querySelector('a.aalink');
        const status = li.querySelector('.completiondropdown button');
        if (link && (!status || !status.classList.contains('btn-success'))) {
            const url = new URL(link.href);
            const id = url.searchParams.get('id');
            const nome = link.textContent.trim();
            if (id) {
                if (/responda|pause/i.test(nome)) {
                    quizzes.push({ href: link.href, nome });
                } else {
                    concluidas.push(marcarPaginaComoConcluida(id, nome));
                }
            }
        }
    });

    await Promise.all(concluidas);

    for (let i = 0; i < quizzes.length; i++) {
        const quiz = quizzes[i];
        try {
            await do_exam(quiz.href);
        } catch { }
        if (i < quizzes.length - 1) await new Promise(r => setTimeout(r, 3000));
    }

    alert('Atividades Finalizadas! | Caso Sobrar alguma execute denovo | Made By Comunide');
    location.reload();
}

verificarPaginas();
