// ===== AI ESTIMATOR MODULE =====
// Модуль AI-оценки стоимости работ
// Работает в режиме симуляции (без API-ключа)
// Для подключения реального AI: замените simulateAI() на вызов OpenAI API

const AIEstimator = (() => {

  // ===== БАЗА ЗНАНИЙ О ЦЕНАХ =====
  const PRICE_DATABASE = {
    kattohuolto: {
      name: 'Kattohuolto (Кровельные работы)',
      nameShort: 'Kattotyöt',
      basePrice: { min: 35, max: 80 },
      unit: '€/m²',
      materials: {
        bitumi: { name: 'Bitumihuopa', multiplier: 1.0 },
        pelti: { name: 'Peltikatto', multiplier: 1.4 },
        tiili: { name: 'Tiilikatto', multiplier: 1.6 },
        muu: { name: 'Muu materiaali', multiplier: 1.2 }
      },
      questions: [
        'Mikä on katon pinta-ala neliömetreinä (m²)?',
        'Millainen kattomateriaali on kyseessä (bitumihuopa, peltikatto, tiilikatto)?',
        'Onko kyseessä korjaus vai kokonaan uusi katto?',
        'Onko katolla piippuja, kattoikkunoita tai muita rakenteita?',
        'Mikä on rakennuksen korkeus (kerrosluku)?'
      ]
    },
    remontointi: {
      name: 'Remontointi (Ремонтные работы)',
      nameShort: 'Remontti',
      basePrice: { min: 40, max: 120 },
      unit: '€/m²',
      materials: {
        maalaus: { name: 'Maalaus', multiplier: 0.6 },
        laatoitus: { name: 'Laatoitus', multiplier: 1.3 },
        tapetointi: { name: 'Tapetointi', multiplier: 0.7 },
        kokonaisremontti: { name: 'Kokonaisremontti', multiplier: 1.8 }
      },
      questions: [
        'Mikä on remontoitavan tilan pinta-ala neliömetreinä (m²)?',
        'Minkä tyyppinen remontti on kyseessä (maalaus, laatoitus, kokonaisremontti)?',
        'Mikä on tilan nykyinen kunto?',
        'Onko kyseessä kylpyhuone, keittiö vai muu tila?',
        'Tarvitaanko vedeneristystä?'
      ]
    },
    peltityot: {
      name: 'Peltityöt (Жестяные работы)',
      nameShort: 'Peltityöt',
      basePrice: { min: 25, max: 65 },
      unit: '€/jm',
      materials: {
        ikkunapelti: { name: 'Ikkunapellit', multiplier: 0.8 },
        julkisivu: { name: 'Julkisivupellit', multiplier: 1.3 },
        piippu: { name: 'Piippupellitys', multiplier: 1.5 },
        muu: { name: 'Muu pellitys', multiplier: 1.0 }
      },
      questions: [
        'Mikä on peltiasennuksen pituus juoksumetreinä (jm)?',
        'Minkä tyyppinen pellitys on kyseessä (ikkunapellit, julkisivupellit, piippupellitys)?',
        'Mikä on materiaalin väri ja paksuus?',
        'Onko kyseessä uudisasennus vai vanhan korvaaminen?'
      ]
    },
    sisatyot: {
      name: 'Sisätyöt (Внутренние работы)',
      nameShort: 'Sisätyöt',
      basePrice: { min: 35, max: 100 },
      unit: '€/m²',
      materials: {
        puutyo: { name: 'Puutyöt', multiplier: 1.0 },
        maalaus: { name: 'Maalaus', multiplier: 0.6 },
        lattia: { name: 'Lattiatyöt', multiplier: 1.2 },
        kokonais: { name: 'Kokonaisremontti', multiplier: 1.6 }
      },
      questions: [
        'Mikä on tilan pinta-ala neliömetreinä (m²)?',
        'Minkä tyyppinen sisätyö on kyseessä?',
        'Onko kyseessä asuintila vai liiketila?',
        'Tarvitaanko sähkö- tai putkitöitä?'
      ]
    },
    kiinteistohuolto: {
      name: 'Kiinteistöhuolto (Обслуживание недвижимости)',
      nameShort: 'Kiinteistöhuolto',
      basePrice: { min: 50, max: 150 },
      unit: '€/kk',
      materials: {},
      questions: [
        'Mikä on kiinteistön tyyppi (omakotitalo, rivitalo, kerrostalo)?',
        'Mikä on kiinteistön pinta-ala?',
        'Millaisia huoltotehtäviä tarvitaan (piha-alueet, lumenauraus, siivous)?',
        'Kuinka usein huolto tarvitaan?'
      ]
    },
    muu: {
      name: 'Muu palvelu (Другие услуги)',
      nameShort: 'Muu palvelu',
      basePrice: { min: 45, max: 90 },
      unit: '€/h',
      materials: {},
      questions: [
        'Voitteko kuvata työn tarkemmin?',
        'Mikä on arvioitu työn laajuus?',
        'Onko kyseessä kiireellinen työ?',
        'Milloin työ pitäisi toteuttaa?'
      ]
    }
  };

  // ===== ТИПЫ СООБЩЕНИЙ =====
  const MSG_TYPE = {
    USER: 'user',
    AI: 'ai',
    SYSTEM: 'system',
    ESTIMATE: 'estimate'
  };

  // ===== СОСТОЯНИЕ РАЗГОВОРА =====
  let conversation = {
    requestId: null,
    service: null,
    messages: [],
    currentQuestionIndex: 0,
    userAnswers: {},
    estimateGenerated: false,
    area: null,
    materialType: null,
    complexity: 'normal', // simple, normal, complex
    photos: [],
    plan: null,
    description: ''
  };

  // ===== УТИЛИТЫ =====
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function generateRequestId() {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const r = randomBetween(100, 999);
    return `KK-${y}${m}${d}-${r}`;
  }

  // ===== ИЗВЛЕЧЕНИЕ ДАННЫХ ИЗ ТЕКСТА =====
  function extractArea(text) {
    // Ищем числа рядом с m², m2, neliö, кв.м и т.д.
    const patterns = [
      /(\d+[\.,]?\d*)\s*(?:m²|m2|neliö|neliömetri|кв\.?\s*м)/i,
      /(\d+[\.,]?\d*)\s*(?:квадрат|квадратн)/i,
      /(?:pinta-ala|площад|area)\s*(?:on|:|\s)\s*(\d+[\.,]?\d*)/i,
      /(\d+)\s*x\s*(\d+)/i // формат WidthxHeight
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[2] && pattern.toString().includes('x')) {
          return parseFloat(match[1]) * parseFloat(match[2]);
        }
        return parseFloat(match[1].replace(',', '.'));
      }
    }

    // Просто ищем числа, если ничего не нашли
    const numMatch = text.match(/(\d+[\.,]?\d*)/);
    if (numMatch) {
      const num = parseFloat(numMatch[1].replace(',', '.'));
      if (num > 5 && num < 10000) return num;
    }

    return null;
  }

  function extractMaterialType(text, service) {
    if (!PRICE_DATABASE[service]) return null;
    const materials = PRICE_DATABASE[service].materials;
    const textLower = text.toLowerCase();

    for (const [key, val] of Object.entries(materials)) {
      if (textLower.includes(key) || textLower.includes(val.name.toLowerCase())) {
        return key;
      }
    }
    return null;
  }

  function analyzeComplexity(text) {
    const complexWords = ['vaativ', 'monimutkain', 'laaja', 'iso', 'suuri', 'koko', 'kokonais', 'сложн', 'больш', 'масштаб', 'полн'];
    const simpleWords = ['pien', 'yksinkertai', 'helppo', 'nopea', 'просто', 'небольш', 'мален', 'мелк'];
    const textLower = text.toLowerCase();

    if (complexWords.some(w => textLower.includes(w))) return 'complex';
    if (simpleWords.some(w => textLower.includes(w))) return 'simple';
    return 'normal';
  }

  // ===== ГЕНЕРАЦИЯ ПРИВЕТСТВИЯ =====
  function generateGreeting(service, description, photosCount, hasPlan) {
    const svc = PRICE_DATABASE[service] || PRICE_DATABASE.muu;
    let greeting = `Kiitos tarjouspyynnöstänne! 👋\n\n`;
    greeting += `Olen Kuusamon Kiinteistökulman AI-avustaja ja autan teitä saamaan alustavan hinta-arvion.\n\n`;

    greeting += `📋 **Palvelutyyppi:** ${svc.nameShort}\n`;
    if (description) {
      greeting += `📝 **Kuvaus:** "${description.substring(0, 100)}${description.length > 100 ? '...' : ''}"\n`;
    }
    if (photosCount > 0) {
      greeting += `📸 **Valokuvat:** ${photosCount} kpl vastaanotettu\n`;
    }
    if (hasPlan) {
      greeting += `📐 **Pohjapiirustus:** Vastaanotettu\n`;
    }

    greeting += `\nAnalysoin nyt tietojanne ja esitän muutaman tarkentavan kysymyksen tarkan arvion laatimiseksi.`;

    return greeting;
  }

  // ===== ГЕНЕРАЦИЯ УТОЧНЯЮЩИХ ВОПРОСОВ =====
  function getNextQuestion() {
    const svc = PRICE_DATABASE[conversation.service] || PRICE_DATABASE.muu;
    const questions = svc.questions;

    // Пропускаем вопрос о площади, если уже извлечена
    let qIndex = conversation.currentQuestionIndex;

    while (qIndex < questions.length) {
      const q = questions[qIndex];

      // Пропускаем вопрос о площади, если уже знаем
      if (conversation.area && (q.includes('pinta-ala') || q.includes('neliö') || q.includes('pituus'))) {
        qIndex++;
        continue;
      }

      // Пропускаем вопрос о материале, если уже знаем
      if (conversation.materialType && (q.includes('materiaali') || q.includes('tyyppi') || q.includes('tyyppinen'))) {
        qIndex++;
        continue;
      }

      conversation.currentQuestionIndex = qIndex + 1;
      return q;
    }

    return null; // Все вопросы заданы
  }

  // ===== ОБРАБОТКА ОТВЕТА ПОЛЬЗОВАТЕЛЯ =====
  function processUserAnswer(answer) {
    // Попробуем извлечь площадь
    if (!conversation.area) {
      const area = extractArea(answer);
      if (area) conversation.area = area;
    }

    // Попробуем определить материал
    if (!conversation.materialType) {
      const mat = extractMaterialType(answer, conversation.service);
      if (mat) conversation.materialType = mat;
    }

    // Определяем сложность
    const complexity = analyzeComplexity(answer);
    if (complexity !== 'normal') {
      conversation.complexity = complexity;
    }

    // Сохраняем ответ
    conversation.userAnswers[`q${Object.keys(conversation.userAnswers).length + 1}`] = answer;
  }

  // ===== ГЕНЕРАЦИЯ AI-ОТВЕТА НА СООБЩЕНИЕ =====
  function generateContextualResponse(userMessage) {
    processUserAnswer(userMessage);

    const nextQ = getNextQuestion();

    if (nextQ) {
      // Есть ещё вопросы
      const ackPhrases = [
        'Kiitos tiedosta! ',
        'Selvä, ymmärrän. ',
        'Hyvä, kiitos! ',
        'Kiitos vastauksesta! ',
        'Selvä asia! '
      ];
      const ack = ackPhrases[randomBetween(0, ackPhrases.length - 1)];
      return {
        type: MSG_TYPE.AI,
        text: `${ack}${nextQ}`,
        isQuestion: true
      };
    } else {
      // Все вопросы заданы, генерируем оценку
      return null; // Сигнал для генерации оценки
    }
  }

  // ===== РАСЧЁТ СТОИМОСТИ =====
  function calculateEstimate() {
    const svc = PRICE_DATABASE[conversation.service] || PRICE_DATABASE.muu;
    const area = conversation.area || randomBetween(30, 80);

    // Множитель материала
    let materialMultiplier = 1.0;
    let materialName = 'Standardi';
    if (conversation.materialType && svc.materials[conversation.materialType]) {
      materialMultiplier = svc.materials[conversation.materialType].multiplier;
      materialName = svc.materials[conversation.materialType].name;
    }

    // Множитель сложности
    const complexityMultiplier = {
      simple: 0.8,
      normal: 1.0,
      complex: 1.3
    }[conversation.complexity];

    // Расчёт
    const basePriceMin = svc.basePrice.min * materialMultiplier * complexityMultiplier;
    const basePriceMax = svc.basePrice.max * materialMultiplier * complexityMultiplier;

    const totalMin = Math.round(basePriceMin * area);
    const totalMax = Math.round(basePriceMax * area);

    // Округляем до сотен
    const roundedMin = Math.round(totalMin / 100) * 100;
    const roundedMax = Math.round(totalMax / 100) * 100;

    return {
      service: svc.nameShort,
      area: area,
      unit: svc.unit,
      material: materialName,
      complexity: conversation.complexity,
      pricePerUnit: { min: Math.round(basePriceMin), max: Math.round(basePriceMax) },
      totalPrice: { min: Math.max(roundedMin, 500), max: Math.max(roundedMax, 1500) },
      includes: generateIncludesList(conversation.service),
      excludes: generateExcludesList(conversation.service),
      timeline: generateTimeline(area, conversation.complexity),
      disclaimer: 'Tämä on alustava hinta-arvio. Lopullinen hinta määräytyy kohteessa tehtävän kartoituksen perusteella.'
    };
  }

  function generateIncludesList(service) {
    const lists = {
      kattohuolto: ['Materiaalit ja työ', 'Vanhan katon purku', 'Jätteiden poiskuljetus', 'Kattoturvatuotteiden asennus'],
      remontointi: ['Materiaalit ja työ', 'Pintamateriaalit', 'Siivous työn jälkeen', 'Suojaukset'],
      peltityot: ['Peltimateriaalit', 'Asennus ja kiinnitys', 'Tiivistykset', 'Vanhojen pellitysten purku'],
      sisatyot: ['Materiaalit ja työ', 'Pintamateriaalit', 'Siivous työn jälkeen', 'Suojaukset'],
      kiinteistohuolto: ['Sovitut huoltotehtävät', 'Raportointi', 'Pienet korjaukset'],
      muu: ['Työ ja materiaalit', 'Konsultaatio']
    };
    return lists[service] || lists.muu;
  }

  function generateExcludesList(service) {
    const lists = {
      kattohuolto: ['Rakenteelliset korjaukset', 'Sähkötyöt', 'Telineiden vuokra (tarvittaessa)'],
      remontointi: ['Sähkötyöt (erillinen urakoitsija)', 'Putkityöt (erillinen urakoitsija)', 'Kalusteet'],
      peltityot: ['Rakenteelliset muutokset', 'Eristystyöt'],
      sisatyot: ['Sähkötyöt', 'Putkityöt', 'Kalusteet'],
      kiinteistohuolto: ['Suuret korjaustyöt', 'Erikoismateriaalit'],
      muu: ['Erikoismateriaalit', 'Alihankinta']
    };
    return lists[service] || lists.muu;
  }

  function generateTimeline(area, complexity) {
    let days;
    if (area < 30) {
      days = complexity === 'complex' ? '3-5' : '1-3';
    } else if (area < 100) {
      days = complexity === 'complex' ? '5-10' : '3-7';
    } else {
      days = complexity === 'complex' ? '10-20' : '7-14';
    }
    return `Arvioitu kesto: ${days} työpäivää`;
  }

  // ===== ФОРМАТИРОВАНИЕ ОЦЕНКИ =====
  function formatEstimate(estimate) {
    let text = `## 📊 Alustava hinta-arvio\n\n`;
    text += `**Palvelu:** ${estimate.service}\n`;
    text += `**Laajuus:** ~${estimate.area} ${estimate.unit.includes('m²') ? 'm²' : estimate.unit.includes('jm') ? 'jm' : 'yksikköä'}\n`;
    text += `**Materiaali:** ${estimate.material}\n\n`;

    text += `### 💰 Hinta-arvio\n`;
    text += `**${estimate.totalPrice.min.toLocaleString('fi-FI')} – ${estimate.totalPrice.max.toLocaleString('fi-FI')} €** (sis. ALV 25,5%)\n`;
    text += `*(${estimate.pricePerUnit.min} – ${estimate.pricePerUnit.max} ${estimate.unit})*\n\n`;

    text += `### ✅ Hintaan sisältyy\n`;
    estimate.includes.forEach(item => {
      text += `• ${item}\n`;
    });

    text += `\n### ❌ Hintaan ei sisälly\n`;
    estimate.excludes.forEach(item => {
      text += `• ${item}\n`;
    });

    text += `\n### ⏱️ Aikataulu\n`;
    text += `${estimate.timeline}\n\n`;

    text += `---\n`;
    text += `⚠️ *${estimate.disclaimer}*`;

    return text;
  }

  // ===== ИНИЦИАЛИЗАЦИЯ РАЗГОВОРА =====
  function initConversation(service, description, photos, plan) {
    conversation = {
      requestId: generateRequestId(),
      service: service || 'muu',
      messages: [],
      currentQuestionIndex: 0,
      userAnswers: {},
      estimateGenerated: false,
      area: extractArea(description || ''),
      materialType: extractMaterialType(description || '', service || 'muu'),
      complexity: analyzeComplexity(description || ''),
      photos: photos || [],
      plan: plan || null,
      description: description || ''
    };

    // Генерируем приветствие
    const greeting = generateGreeting(
      conversation.service,
      conversation.description,
      conversation.photos.length,
      !!conversation.plan
    );

    conversation.messages.push({
      type: MSG_TYPE.AI,
      text: greeting,
      timestamp: new Date().toISOString()
    });

    return {
      requestId: conversation.requestId,
      greeting: greeting
    };
  }

  // ===== ОТПРАВКА СООБЩЕНИЯ =====
  async function sendMessage(userMessage) {
    // Добавляем сообщение пользователя
    conversation.messages.push({
      type: MSG_TYPE.USER,
      text: userMessage,
      timestamp: new Date().toISOString()
    });

    // Имитация "думания" AI
    await delay(randomBetween(1000, 2500));

    // Генерируем ответ
    const response = generateContextualResponse(userMessage);

    if (response) {
      // Есть ещё вопросы
      conversation.messages.push({
        ...response,
        timestamp: new Date().toISOString()
      });
      return {
        type: 'question',
        message: response.text,
        questionsRemaining: getQuestionsRemaining()
      };
    } else {
      // Генерируем оценку
      await delay(randomBetween(1500, 3000));

      const estimate = calculateEstimate();
      const formattedEstimate = formatEstimate(estimate);

      conversation.messages.push({
        type: MSG_TYPE.ESTIMATE,
        text: formattedEstimate,
        estimate: estimate,
        timestamp: new Date().toISOString()
      });

      conversation.estimateGenerated = true;

      return {
        type: 'estimate',
        message: formattedEstimate,
        estimate: estimate
      };
    }
  }

  function getQuestionsRemaining() {
    const svc = PRICE_DATABASE[conversation.service] || PRICE_DATABASE.muu;
    return Math.max(0, svc.questions.length - conversation.currentQuestionIndex);
  }

  // ===== ПОЛУЧЕНИЕ ПЕРВОГО ВОПРОСА =====
  async function getFirstQuestion() {
    await delay(randomBetween(800, 1500));

    // Если из описания уже извлечено много данных, можно пропустить часть вопросов
    const nextQ = getNextQuestion();

    if (nextQ) {
      const msg = {
        type: MSG_TYPE.AI,
        text: nextQ,
        isQuestion: true,
        timestamp: new Date().toISOString()
      };
      conversation.messages.push(msg);
      return {
        type: 'question',
        message: nextQ,
        questionsRemaining: getQuestionsRemaining()
      };
    } else {
      // Достаточно данных для оценки
      const estimate = calculateEstimate();
      const formattedEstimate = formatEstimate(estimate);
      conversation.messages.push({
        type: MSG_TYPE.ESTIMATE,
        text: formattedEstimate,
        estimate: estimate,
        timestamp: new Date().toISOString()
      });
      conversation.estimateGenerated = true;
      return {
        type: 'estimate',
        message: formattedEstimate,
        estimate: estimate
      };
    }
  }

  // ===== СОХРАНЕНИЕ ЗАЯВКИ =====
  function saveRequest(clientInfo) {
    const request = {
      id: conversation.requestId,
      status: 'new',
      createdAt: new Date().toISOString(),
      client: clientInfo,
      service: conversation.service,
      serviceName: (PRICE_DATABASE[conversation.service] || PRICE_DATABASE.muu).nameShort,
      description: conversation.description,
      photos: conversation.photos,
      plan: conversation.plan,
      messages: conversation.messages,
      estimate: conversation.estimateGenerated ? calculateEstimate() : null,
      userAnswers: conversation.userAnswers,
      area: conversation.area,
      materialType: conversation.materialType,
      complexity: conversation.complexity,
      adminNotes: '',
      adminPrice: null
    };

    // Сохраняем в localStorage
    const requests = JSON.parse(localStorage.getItem('kk_requests') || '[]');
    requests.unshift(request);
    localStorage.setItem('kk_requests', JSON.stringify(requests));

    return request;
  }

  // ===== ПУБЛИЧНЫЙ API =====
  return {
    initConversation,
    sendMessage,
    getFirstQuestion,
    saveRequest,
    getConversation: () => ({ ...conversation }),
    PRICE_DATABASE,
    MSG_TYPE
  };

})();
