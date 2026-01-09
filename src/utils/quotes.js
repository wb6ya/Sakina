/**
 * @file quotes.js
 * @description قائمة اقتباسات إسلامية (قرآن وسنة) مع الترجمة الإنجليزية
 */

export const ISLAMIC_QUOTES = [
    // --- آيات قرآنية (Quranic Verses) ---
    {
        "type": "QURAN",
        "text": "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
        "source": "سورة الفاتحة - 2",
        "text_en": "All praise is [due] to Allah, Lord of the worlds.",
        "source_en": "Surah Al-Fatihah - 2"
    },
    {
        "type": "QURAN",
        "text": "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
        "source": "سورة الفاتحة - 5",
        "text_en": "It is You we worship and You we ask for help.",
        "source_en": "Surah Al-Fatihah - 5"
    },
    {
        "type": "QURAN",
        "text": "اهدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
        "source": "سورة الفاتحة - 6",
        "text_en": "Guide us to the straight path.",
        "source_en": "Surah Al-Fatihah - 6"
    },
    {
        "type": "QURAN",
        "text": "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ",
        "source": "سورة البقرة - 255",
        "text_en": "Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence.",
        "source_en": "Surah Al-Baqarah - 255"
    },
    {
        "type": "QURAN",
        "text": "لَا إِكْرَاهَ فِي الدِّينِ",
        "source": "سورة البقرة - 256",
        "text_en": "There shall be no compulsion in [acceptance of] the religion.",
        "source_en": "Surah Al-Baqarah - 256"
    },
    {
        "type": "QURAN",
        "text": "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
        "source": "سورة البقرة - 286",
        "text_en": "Allah does not charge a soul except [with that within] its capacity.",
        "source_en": "Surah Al-Baqarah - 286"
    },
    {
        "type": "QURAN",
        "text": "وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا",
        "source": "سورة آل عمران - 103",
        "text_en": "And hold firmly to the rope of Allah all together and do not become divided.",
        "source_en": "Surah Ali 'Imran - 103"
    },
    {
        "type": "QURAN",
        "text": "كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ",
        "source": "سورة آل عمران - 185",
        "text_en": "Every soul will taste death.",
        "source_en": "Surah Ali 'Imran - 185"
    },
    {
        "type": "QURAN",
        "text": "وَقُل رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
        "source": "سورة الإسراء - 24",
        "text_en": "And say, 'My Lord, have mercy upon them as they brought me up [when I was] small.'",
        "source_en": "Surah Al-Isra - 24"
    },
    {
        "type": "QURAN",
        "text": "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
        "source": "سورة البقرة - 153",
        "text_en": "Indeed, Allah is with the patient.",
        "source_en": "Surah Al-Baqarah - 153"
    },
    {
        "type": "QURAN",
        "text": "وَبِالْوَالِدَيْنِ إِحْسَانًا",
        "source": "سورة الإسراء - 23",
        "text_en": "And to parents, good treatment.",
        "source_en": "Surah Al-Isra - 23"
    },
    {
        "type": "QURAN",
        "text": "إِنَّ رَحْمَتَ اللَّهِ قَرِيبٌ مِّنَ الْمُحْسِنِينَ",
        "source": "سورة الأعراف - 56",
        "text_en": "Indeed, the mercy of Allah is near to the doers of good.",
        "source_en": "Surah Al-A'raf - 56"
    },
    {
        "type": "QURAN",
        "text": "إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ",
        "source": "سورة النحل - 90",
        "text_en": "Indeed, Allah orders justice and good conduct.",
        "source_en": "Surah An-Nahl - 90"
    },
    {
        "type": "QURAN",
        "text": "ادْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ الْحَسَنَةِ",
        "source": "سورة النحل - 125",
        "text_en": "Invite to the way of your Lord with wisdom and good instruction.",
        "source_en": "Surah An-Nahl - 125"
    },
    {
        "type": "QURAN",
        "text": "وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ",
        "source": "سورة الأنبياء - 30",
        "text_en": "And We made from water every living thing.",
        "source_en": "Surah Al-Anbiya - 30"
    },
    {
        "type": "QURAN",
        "text": "وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ",
        "source": "سورة الأنبياء - 107",
        "text_en": "And We have not sent you, [O Muhammad], except as a mercy to the worlds.",
        "source_en": "Surah Al-Anbiya - 107"
    },
    {
        "type": "QURAN",
        "text": "نَبِّئْ عِبَادِي أَنِّي أَنَا الْغَفُورُ الرَّحِيمُ",
        "source": "سورة الحجر - 49",
        "text_en": "[O Muhammad], inform My servants that it is I who am the Forgiving, the Merciful.",
        "source_en": "Surah Al-Hijr - 49"
    },
    {
        "type": "QURAN",
        "text": "وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ ۖ وَلَا تَعَاوَنُوا عَلَى الْإِثْمِ وَالْعُدْوَانِ",
        "source": "سورة المائدة - 2",
        "text_en": "And cooperate in righteousness and piety, but do not cooperate in sin and aggression.",
        "source_en": "Surah Al-Ma'idah - 2"
    },
    {
        "type": "QURAN",
        "text": "وَأَوْفُوا بِالْعَهْدِ ۖ إِنَّ الْعَهْدَ كَانَ مَسْئُولًا",
        "source": "سورة الإسراء - 34",
        "text_en": "And fulfill [every] commitment. Indeed, the commitment is ever [that about which one will be] questioned.",
        "source_en": "Surah Al-Isra - 34"
    },
    {
        "type": "QURAN",
        "text": "يَا أَيُّهَا النَّاسُ إِنَّا خَلَقْنَاكُم مِّن ذَكَرٍ وَأُنثَىٰ وَجَعَلْنَاكُمْ شُعُوبًا وَقَبَائِلَ لِتَعَارَفُوا",
        "source": "سورة الحجرات - 13",
        "text_en": "O mankind, indeed We have created you from male and female and made you peoples and tribes that you may know one another.",
        "source_en": "Surah Al-Hujurat - 13"
    },
    {
        "type": "QURAN",
        "text": "إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ",
        "source": "سورة الحجرات - 13",
        "text_en": "Indeed, the most noble of you in the sight of Allah is the most righteous of you.",
        "source_en": "Surah Al-Hujurat - 13"
    },
    {
        "type": "QURAN",
        "text": "وَلَا تَقْفُ مَا لَيْسَ لَكَ بِهِ عِلْمٌ",
        "source": "سورة الإسراء - 36",
        "text_en": "And do not pursue that of which you have no knowledge.",
        "source_en": "Surah Al-Isra - 36"
    },
    {
        "type": "QURAN",
        "text": "ادْفَعْ بِالَّتِي هِيَ أَحْسَنُ",
        "source": "سورة فصلت - 34",
        "text_en": "Repel [evil] by that [deed] which is better.",
        "source_en": "Surah Fussilat - 34"
    },
    {
        "type": "QURAN",
        "text": "وَلَا تَمْشِ فِي الْأَرْضِ مَرَحًا",
        "source": "سورة الإسراء - 37",
        "text_en": "And do not walk upon the earth exultantly.",
        "source_en": "Surah Al-Isra - 37"
    },
    {
        "type": "QURAN",
        "text": "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
        "source": "سورة الشرح - 5",
        "text_en": "For indeed, with hardship [will be] ease.",
        "source_en": "Surah Ash-Sharh - 5"
    },
    {
        "type": "QURAN",
        "text": "وَخُلِقَ الْإِنسَانُ ضَعِيفًا",
        "source": "سورة النساء - 28",
        "text_en": "And mankind was created weak.",
        "source_en": "Surah An-Nisa - 28"
    },
    {
        "type": "QURAN",
        "text": "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
        "source": "سورة الطلاق - 3",
        "text_en": "And whoever relies upon Allah - then He is sufficient for him.",
        "source_en": "Surah At-Talaq - 3"
    },
    {
        "type": "QURAN",
        "text": "وَسَارِعُوا إِلَىٰ مَغْفِرَةٍ مِّن رَّبِّكُمْ وَجَنَّةٍ عَرْضُهَا السَّمَاوَاتُ وَالْأَرْضُ",
        "source": "سورة آل عمران - 133",
        "text_en": "And hasten to forgiveness from your Lord and a garden as wide as the heavens and earth.",
        "source_en": "Surah Ali 'Imran - 133"
    },
    {
        "type": "QURAN",
        "text": "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
        "source": "سورة إبراهيم - 7",
        "text_en": "If you are grateful, I will surely increase you [in favor].",
        "source_en": "Surah Ibrahim - 7"
    },
    {
        "type": "QURAN",
        "text": "إِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ",
        "source": "سورة التوبة - 120",
        "text_en": "Indeed, Allah does not allow to be lost the reward of the doers of good.",
        "source_en": "Surah At-Tawbah - 120"
    },
    {
        "type": "QURAN",
        "text": "أَمَّن يُجِيبُ الْمُضْطَرَّ إِذَا دَعَاهُ وَيَكْشِفُ السُّوءَ",
        "source": "سورة النمل - 62",
        "text_en": "Is He [not best] who responds to the desperate one when he calls upon Him and removes evil.",
        "source_en": "Surah An-Naml - 62"
    },
    {
        "type": "QURAN",
        "text": "فَاصْبِرْ صَبْرًا جَمِيلًا",
        "source": "سورة المعارج - 5",
        "text_en": "So be patient with gracious patience.",
        "source_en": "Surah Al-Ma'arij - 5"
    },
    {
        "type": "QURAN",
        "text": "وَاللَّهُ يَعْلَمُ مَا فِي قُلُوبِكُمْ",
        "source": "سورة الأحزاب - 51",
        "text_en": "And Allah knows what is in your hearts.",
        "source_en": "Surah Al-Ahzab - 51"
    },
    {
        "type": "QURAN",
        "text": "يَا أَيُّهَا الَّذِينَ آمَنُوا اذْكُرُوا اللَّهَ ذِكْرًا كَثِيرًا",
        "source": "سورة الأحزاب - 41",
        "text_en": "O you who have believed, remember Allah with much remembrance.",
        "source_en": "Surah Al-Ahzab - 41"
    },
    {
        "type": "QURAN",
        "text": "قُلِ اللَّهُ خَالِقُ كُلِّ شَيْءٍ",
        "source": "سورة الرعد - 16",
        "text_en": "Say, 'Allah is the Creator of all things.'",
        "source_en": "Surah Ar-Ra'd - 16"
    },
    {
        "type": "QURAN",
        "text": "وَقُولُوا لِلنَّاسِ حُسْنًا",
        "source": "سورة البقرة - 83",
        "text_en": "And speak to people good [words].",
        "source_en": "Surah Al-Baqarah - 83"
    },
    {
        "type": "QURAN",
        "text": "وَأَحْسِنُوا ۛ إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ",
        "source": "سورة البقرة - 195",
        "text_en": "And do good; indeed, Allah loves the doers of good.",
        "source_en": "Surah Al-Baqarah - 195"
    },
    {
        "type": "QURAN",
        "text": "إِنَّ الدِّينَ عِندَ اللَّهِ الْإِسْلَامُ",
        "source": "سورة آل عمران - 19",
        "text_en": "Indeed, the religion in the sight of Allah is Islam.",
        "source_en": "Surah Ali 'Imran - 19"
    },
    {
        "type": "QURAN",
        "text": "وَاللَّهُ يُحِبُّ الصَّابِرِينَ",
        "source": "سورة آل عمران - 146",
        "text_en": "And Allah loves the patient.",
        "source_en": "Surah Ali 'Imran - 146"
    },
    {
        "type": "QURAN",
        "text": "يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَقُولُوا قَوْلًا سَدِيدًا",
        "source": "سورة الأحزاب - 70",
        "text_en": "O you who have believed, fear Allah and speak words of appropriate justice.",
        "source_en": "Surah Al-Ahzab - 70"
    },
    {
        "type": "QURAN",
        "text": "وَإِذَا حُيِّيتُم بِتَحِيَّةٍ فَحَيُّوا بِأَحْسَنَ مِنْهَا أَوْ رُدُّوهَا",
        "source": "سورة النساء - 86",
        "text_en": "And when you are greeted with a greeting, greet [in return] with one better than it or [at least] return it.",
        "source_en": "Surah An-Nisa - 86"
    },
    {
        "type": "QURAN",
        "text": "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ",
        "source": "سورة النجم - 39",
        "text_en": "And that there is not for man except that [good] for which he strives.",
        "source_en": "Surah An-Najm - 39"
    },
    {
        "type": "QURAN",
        "text": "فَسَبِّحْ بِحَمْدِ رَبِّكَ وَاسْتَغْفِرْهُ ۚ إِنَّهُ كَانَ تَوَّابًا",
        "source": "سورة النصر - 3",
        "text_en": "Then exalt [Him] with praise of your Lord and ask forgiveness of Him. Indeed, He is ever Accepting of repentance.",
        "source_en": "Surah An-Nasr - 3"
    },
    {
        "type": "QURAN",
        "text": "وَمَا كَانَ اللَّهُ لِيُعَذِّبَهُمْ وَأَنتَ فِيهِمْ ۚ وَمَا كَانَ اللَّهُ مُعَذِّبَهُمْ وَهُمْ يَسْتَغْفِرُونَ",
        "source": "سورة الأنفال - 33",
        "text_en": "But Allah would not punish them while you, [O Muhammad], are among them, and Allah would not punish them while they seek forgiveness.",
        "source_en": "Surah Al-Anfal - 33"
    },
    {
        "type": "QURAN",
        "text": "قُلْ هُوَ اللَّهُ أَحَدٌ",
        "source": "سورة الإخلاص - 1",
        "text_en": "Say, 'He is Allah, [who is] One.'",
        "source_en": "Surah Al-Ikhlas - 1"
    },
    {
        "type": "QURAN",
        "text": "اللَّهُ الصَّمَدُ",
        "source": "سورة الإخلاص - 2",
        "text_en": "Allah, the Eternal Refuge.",
        "source_en": "Surah Al-Ikhlas - 2"
    },
    {
        "type": "QURAN",
        "text": "لَمْ يَلِدْ وَلَمْ يُولَدْ",
        "source": "سورة الإخلاص - 3",
        "text_en": "He neither begets nor is born.",
        "source_en": "Surah Al-Ikhlas - 3"
    },
    {
        "type": "QURAN",
        "text": "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
        "source": "سورة الإخلاص - 4",
        "text_en": "Nor is there to Him any equivalent.",
        "source_en": "Surah Al-Ikhlas - 4"
    },
    {
        "type": "QURAN",
        "text": "مَا وَدَّعَكَ رَبُّكَ وَمَا قَلَىٰ",
        "source": "سورة الضحى - 3",
        "text_en": "Your Lord has not taken leave of you, [O Muhammad], nor has He detested [you].",
        "source_en": "Surah Ad-Duha - 3"
    },

    // --- أحاديث نبوية (Prophetic Hadiths) ---
    [
    {
        "type": "HADITH",
        "text": "إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى",
        "source": "الأربعين النووية - حديث 1",
        "text_en": "Actions are but by intentions, and every man shall have only that which he intended.",
        "source_en": "Sahih Al-Bukhari & Muslim"
    },
    {
        "type": "HADITH",
        "text": "بني الإسلام على خمس: شهادة أن لا إله إلا الله وأن محمداً رسول الله، وإقام الصلاة، وإيتاء الزكاة، وحج البيت، وصوم رمضان",
        "source": "الأربعين النووية - حديث 3",
        "text_en": "Islam is built upon five [pillars]: testifying that there is no true god except Allah and that Muhammad is the Messenger of Allah, establishing prayer, paying zakah, Hajj, and fasting Ramadan.",
        "source_en": "Sahih Al-Bukhari & Muslim"
    },
    {
        "type": "HADITH",
        "text": "من أحدث في أمرنا هذا ما ليس منه فهو رد",
        "source": "الأربعين النووية - حديث 5",
        "text_en": "He who innovates something in this matter of ours [i.e., Islam] that is not of it will have it rejected.",
        "source_en": "Sahih Al-Bukhari & Muslim"
    },
    {
        "type": "HADITH",
        "text": "إن الحلال بين وإن الحرام بين وبينهما أمور مشتبهات",
        "source": "الأربعين النووية - حديث 6",
        "text_en": "That which is lawful is clear and that which is unlawful is clear, and between the two of them are doubtful matters.",
        "source_en": "Sahih Al-Bukhari & Muslim"
    },
    {
        "type": "HADITH",
        "text": "الدين النصيحة. قلنا: لمن؟ قال: لله ولكتابه ولرسوله ولأئمة المسلمين وعامتهم",
        "source": "الأربعين النووية - حديث 7",
        "text_en": "Religion is sincerity. We said: To whom? He said: To Allah, His Book, His Messenger, and to the leaders of the Muslims and their common folk.",
        "source_en": "Sahih Muslim"
    },
    {
        "type": "HADITH",
        "text": "أمرت أن أقاتل الناس حتى يشهدوا أن لا إله إلا الله وأن محمداً رسول الله",
        "source": "الأربعين النووية - حديث 8",
        "text_en": "I have been commanded to fight against people till they testify that there is no true god except Allah and that Muhammad is the Messenger of Allah.",
        "source_en": "Sahih Al-Bukhari & Muslim"
    },
    {
        "type": "HADITH",
        "text": "ما نهيتكم عنه فاجتنبوه، وما أمرتكم به فأتوا منه ما استطعتم",
        "source": "الأربعين النووية - حديث 9",
        "text_en": "What I have forbidden for you, avoid. What I have enjoined upon you, do as much of it as you can.",
        "source_en": "Sahih Al-Bukhari & Muslim"
    },
    {
        "type": "HADITH",
        "text": "إن الله طيب لا يقبل إلا طيباً",
        "source": "الأربعين النووية - حديث 10",
        "text_en": "Allah the Almighty is Good and accepts only that which is good.",
        "source_en": "Sahih Muslim"
    },
    {
        "type": "HADITH",
        "text": "دع ما يريبك إلى ما لا يريبك",
        "source": "الأربعين النووية - حديث 11",
        "text_en": "Leave that which makes you doubt for that which does not make you doubt.",
        "source_en": "Sunan At-Tirmidhi"
    },
    {
        "type": "HADITH",
        "text": "من حسن إسلام المرء تركه ما لا يعنيه",
        "source": "الأربعين النووية - حديث 12",
        "text_en": "Part of the perfection of one's Islam is his leaving that which does not concern him.",
        "source_en": "Sunan At-Tirmidhi"
    },
    {
        "type": "HADITH",
        "text": "لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه",
        "source": "الأربعين النووية - حديث 13",
        "text_en": "None of you [truly] believes until he loves for his brother what he loves for himself.",
        "source_en": "Sahih Al-Bukhari & Muslim"
    },
    {
        "type": "HADITH",
        "text": "لا يحل دم امرئ مسلم إلا بإحدى ثلاث: الثيب الزاني، والنفس بالنفس، والتارك لدينه المفارق للجماعة",
        "source": "الأربعين النووية - حديث 14",
        "text_en": "The blood of a Muslim cannot be shed except in three cases: the married person who commits adultery, a life for a life, and the one who forsakes his religion and separates from the community.",
        "source_en": "Sahih Al-Bukhari & Muslim"
    },
    {
        "type": "HADITH",
        "text": "من كان يؤمن بالله واليوم الآخر فليقل خيراً أو ليصمت",
        "source": "الأربعين النووية - حديث 15",
        "text_en": "Whosoever believes in Allah and the Last Day, let him say good or remain silent.",
        "source_en": "Sahih Al-Bukhari & Muslim"
    },
    {
        "type": "HADITH",
        "text": "لا تغضب",
        "source": "الأربعين النووية - حديث 16",
        "text_en": "Do not become angry.",
        "source_en": "Sahih Al-Bukhari"
    },
    {
        "type": "HADITH",
        "text": "إن الله كتب الإحسان على كل شيء. فإذا قتلتم فأحسنوا القتلة، وإذا ذبحتم فأحسنوا الذبح",
        "source": "الأربعين النووية - حديث 17",
        "text_en": "Allah has prescribed proficiency in all things. So if you kill, kill well; and if you slaughter, slaughter well.",
        "source_en": "Sahih Muslim"
    },
    {
        "type": "HADITH",
        "text": "اتق الله حيثما كنت، وأتبع السيئة الحسنة تمحها، وخالق الناس بخلق حسن",
        "source": "الأربعين النووية - حديث 18",
        "text_en": "Fear Allah wherever you may be, and follow up an evil deed with a good deed which will wipe it out, and behave well towards the people.",
        "source_en": "Sunan At-Tirmidhi"
    },
    {
        "type": "HADITH",
        "text": "يا غلام، إني أعلمك كلمات: احفظ الله يحفظك، احفظ الله تجده تجاهك",
        "source": "الأربعين النووية - حديث 19",
        "text_en": "O young man, I shall teach you some words: Be mindful of Allah and Allah will protect you. Be mindful of Allah and you will find Him in front of you.",
        "source_en": "Sunan At-Tirmidhi"
    },
    {
        "type": "HADITH",
        "text": "إذا لم تستح فاصنع ما شئت",
        "source": "الأربعين النووية - حديث 20",
        "text_en": "If you feel no shame, then do as you wish.",
        "source_en": "Sahih Al-Bukhari"
    },
    {
        "type": "HADITH",
        "text": "قل: آمنت بالله، ثم استقم",
        "source": "الأربعين النووية - حديث 21",
        "text_en": "Say: I believe in Allah, and then be steadfast.",
        "source_en": "Sahih Muslim"
    },
    {
        "type": "HADITH",
        "text": "يا عبادي إني حرمت الظلم على نفسي وجعلته بينكم محرماً فلا تظالموا",
        "source": "الأربعين النووية - حديث 24",
        "text_en": "O My servants, I have forbidden oppression for Myself and have made it forbidden amongst you, so do not oppress one another.",
        "source_en": "Sahih Muslim"
    },
    {
        "type": "HADITH",
        "text": "كل سلامى من الناس عليه صدقة كل يوم تطلع فيه الشمس",
        "source": "الأربعين النووية - حديث 26",
        "text_en": "Each of a person’s joints must perform a charity every day that the sun rises.",
        "source_en": "Sahih Al-Bukhari & Muslim"
    },
    {
        "type": "HADITH",
        "text": "البر حسن الخلق، والإثم ما حاك في نفسك وكرهت أن يطلع عليه الناس",
        "source": "الأربعين النووية - حديث 27",
        "text_en": "Righteousness is good character, and sin is that which wavers in your heart and which you would hate for people to find out about.",
        "source_en": "Sahih Muslim"
    },
    {
        "type": "HADITH",
        "text": "عليكم بسنتي وسنة الخلفاء الراشدين المهديين من بعدي، عضوا عليها بالنواجذ",
        "source": "الأربعين النووية - حديث 28",
        "text_en": "You must stick to my sunnah and the sunnah of the rightly guided Caliphs, bite onto it with your molars.",
        "source_en": "Sunan Abi Dawud"
    },
    {
        "type": "HADITH",
        "text": "ازهد في الدنيا يحبك الله، وازهد فيما عند الناس يحبك الناس",
        "source": "الأربعين النووية - حديث 31",
        "text_en": "Renounce the world and Allah will love you, and renounce what people possess and people will love you.",
        "source_en": "Sunan Ibn Majah"
    },
    {
        "type": "HADITH",
        "text": "لا ضرر ولا ضرار",
        "source": "الأربعين النووية - حديث 32",
        "text_en": "There should be neither harming nor reciprocating harm.",
        "source_en": "Sunan Ibn Majah"
    },
    {
        "type": "HADITH",
        "text": "لو يعطى الناس بدعواهم، لادعى رجال أموال قوم ودماءهم",
        "source": "الأربعين النووية - حديث 33",
        "text_en": "Were people to be given in accordance with their claims, men would claim the fortunes and lives of [other] people.",
        "source_en": "Sahih Al-Bukhari & Muslim"
    },
    {
        "type": "HADITH",
        "text": "من رأى منكم منكراً فليغيره بيده، فإن لم يستطع فبلسانه، فإن لم يستطع فبقلبه",
        "source": "الأربعين النووية - حديث 34",
        "text_en": "Whosoever of you sees an evil, let him change it with his hand; and if he is not able to do so, then with his tongue; and if he is not able to do so, then with his heart.",
        "source_en": "Sahih Muslim"
    },
    {
        "type": "HADITH",
        "text": "لا تحاسدوا، ولا تناجشوا، ولا تباغضوا، ولا تدابروا، وكونوا عباد الله إخواناً",
        "source": "الأربعين النووية - حديث 35",
        "text_en": "Do not envy one another, do not inflate prices for one another, do not hate one another, do not turn your backs on one another, and be servants of Allah as brothers.",
        "source_en": "Sahih Muslim"
    },
    {
        "type": "HADITH",
        "text": "من نفس عن مؤمن كربة من كرب الدنيا نفس الله عنه كربة من كرب يوم القيامة",
        "source": "الأربعين النووية - حديث 36",
        "text_en": "Whosoever removes a worldly grief from a believer, Allah will remove from him one of the griefs of the Day of Resurrection.",
        "source_en": "Sahih Muslim"
    },
    {
        "type": "HADITH",
        "text": "إن الله تجاوز لي عن أمتي الخطأ والنسيان وما استكرهوا عليه",
        "source": "الأربعين النووية - حديث 39",
        "text_en": "Allah has pardoned for me my nation their mistakes and forgetfulness, and what they are forced to do.",
        "source_en": "Sunan Ibn Majah"
    },
    {
        "type": "HADITH",
        "text": "كن في الدنيا كأنك غريب أو عابر سبيل",
        "source": "الأربعين النووية - حديث 40",
        "text_en": "Be in this world as though you were a stranger or a wayfarer.",
        "source_en": "Sahih Al-Bukhari"
    },
    {
        "type": "HADITH",
        "text": "لا يؤمن أحدكم حتى يكون هواه تبعاً لما جئت به",
        "source": "الأربعين النووية - حديث 41",
        "text_en": "None of you [truly] believes until his inclination is in accordance with what I have brought.",
        "source_en": "Al-Hujjah"
    },
    {
        "type": "HADITH",
        "text": "يا ابن آدم إنك ما دعوتني ورجوتني غفرت لك على ما كان فيك ولا أبالي",
        "source": "الأربعين النووية - حديث 42",
        "text_en": "O son of Adam, so long as you call upon Me and ask of Me, I shall forgive you for what you have done, and I shall not mind.",
        "source_en": "Sunan At-Tirmidhi"
    }
]

export const getRandomQuote = () => {
    const index = Math.floor(Math.random() * ISLAMIC_QUOTES.length);
    return ISLAMIC_QUOTES[index];
};
