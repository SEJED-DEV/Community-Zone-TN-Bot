const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const levelingManager = require('./levelingManager');
const logger = require('../utils/logger');

const statsPath = path.join(__dirname, '../../data/mrwhite_stats.json');

const WORDS = [
  // 🍔 Food & Drinks
  { word: 'بيتزا', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'همبرغر', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'شاورما', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'كسكسي', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'مقرونة', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'سلطة', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'خبز', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'جبن', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'تفاحة', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'برتقالة', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'موزة', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'فراولة', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'تمر', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'عسل', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'شوكولاتة', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'كعكة', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'دونات', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'آيس كريم', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'حساء', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'أرز', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'سمك', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'دجاج', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'لحم', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'بيض', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'بطاطا', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'قهوة', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'شاي', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'عصير', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'حليب', category: '🍔 الطعام والشراب (Food & Drinks)' },
  { word: 'ماء', category: '🍔 الطعام والشراب (Food & Drinks)' },

  // 🚗 Transportation
  { word: 'سيارة', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'طائرة', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'هليكوبتر', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'دراجة', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'سفينة', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'قطار', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'حافلة', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'تاكسي', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'مترو', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'ترام', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'شاحنة', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'زورق', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'صاروخ', category: '🚗 وسائل النقل (Transportation)' },
  { word: 'غواصة', category: '🚗 وسائل النقل (Transportation)' },

  // 📱 Technology
  { word: 'هاتف', category: '📱 التكنولوجيا (Technology)' },
  { word: 'كمبيوتر', category: '📱 التكنولوجيا (Technology)' },
  { word: 'لابتوب', category: '📱 التكنولوجيا (Technology)' },
  { word: 'كيبورد', category: '📱 التكنولوجيا (Technology)' },
  { word: 'فأرة', category: '📱 التكنولوجيا (Technology)' },
  { word: 'سماعة', category: '📱 التكنولوجيا (Technology)' },
  { word: 'شاحن', category: '📱 التكنولوجيا (Technology)' },
  { word: 'كاميرا', category: '📱 التكنولوجيا (Technology)' },
  { word: 'تلفاز', category: '📱 التكنولوجيا (Technology)' },
  { word: 'ريموت', category: '📱 التكنولوجيا (Technology)' },
  { word: 'طابعة', category: '📱 التكنولوجيا (Technology)' },
  { word: 'ميكروفون', category: '📱 التكنولوجيا (Technology)' },
  { word: 'روبوت', category: '📱 التكنولوجيا (Technology)' },
  { word: 'ذكاء اصطناعي', category: '📱 التكنولوجيا (Technology)' },
  { word: 'إنترنت', category: '📱 التكنولوجيا (Technology)' },
  { word: 'واي فاي', category: '📱 التكنولوجيا (Technology)' },
  { word: 'شاشة', category: '📱 التكنولوجيا (Technology)' },

  // 🏠 Places
  { word: 'منزل', category: '🏠 الأماكن (Places)' },
  { word: 'مدرسة', category: '🏠 الأماكن (Places)' },
  { word: 'جامعة', category: '🏠 الأماكن (Places)' },
  { word: 'مستشفى', category: '🏠 الأماكن (Places)' },
  { word: 'مطعم', category: '🏠 الأماكن (Places)' },
  { word: 'مقهى', category: '🏠 الأماكن (Places)' },
  { word: 'مطار', category: '🏠 الأماكن (Places)' },
  { word: 'فندق', category: '🏠 الأماكن (Places)' },
  { word: 'ملعب', category: '🏠 الأماكن (Places)' },
  { word: 'مكتبة', category: '🏠 الأماكن (Places)' },
  { word: 'حديقة', category: '🏠 الأماكن (Places)' },
  { word: 'متحف', category: '🏠 الأماكن (Places)' },
  { word: 'سوق', category: '🏠 الأماكن (Places)' },
  { word: 'صيدلية', category: '🏠 الأماكن (Places)' },
  { word: 'بنك', category: '🏠 الأماكن (Places)' },
  { word: 'مسجد', category: '🏠 الأماكن (Places)' },
  { word: 'شاطئ', category: '🏠 الأماكن (Places)' },
  { word: 'مخبزة', category: '🏠 الأماكن (Places)' },

  // 🌍 Nature
  { word: 'شمس', category: '🌍 الطبيعة (Nature)' },
  { word: 'قمر', category: '🌍 الطبيعة (Nature)' },
  { word: 'نجم', category: '🌍 الطبيعة (Nature)' },
  { word: 'بحر', category: '🌍 الطبيعة (Nature)' },
  { word: 'جبل', category: '🌍 الطبيعة (Nature)' },
  { word: 'غابة', category: '🌍 الطبيعة (Nature)' },
  { word: 'نهر', category: '🌍 الطبيعة (Nature)' },
  { word: 'صحراء', category: '🌍 الطبيعة (Nature)' },
  { word: 'مطر', category: '🌍 الطبيعة (Nature)' },
  { word: 'ثلج', category: '🌍 الطبيعة (Nature)' },
  { word: 'رياح', category: '🌍 الطبيعة (Nature)' },
  { word: 'برق', category: '🌍 الطبيعة (Nature)' },
  { word: 'رعد', category: '🌍 الطبيعة (Nature)' },
  { word: 'وردة', category: '🌍 الطبيعة (Nature)' },
  { word: 'شجرة', category: '🌍 الطبيعة (Nature)' },
  { word: 'زهرة', category: '🌍 الطبيعة (Nature)' },
  { word: 'عشب', category: '🌍 الطبيعة (Nature)' },
  { word: 'جزيرة', category: '🌍 الطبيعة (Nature)' },
  { word: 'بركان', category: '🌍 الطبيعة (Nature)' },

  // 👨💼 Jobs
  { word: 'طبيب', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'مهندس', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'معلم', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'طيار', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'شرطي', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'طباخ', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'ممرض', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'رسام', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'كاتب', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'نجار', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'مبرمج', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'محاسب', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'محامي', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'صحفي', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'مصور', category: '👨‍💼 الوظائف والمهن (Jobs)' },
  { word: 'حداد', category: '👨‍💼 الوظائف والمهن (Jobs)' },

  // 🐾 Animals
  { word: 'أسد', category: '🐾 الحيوانات (Animals)' },
  { word: 'نمر', category: '🐾 الحيوانات (Animals)' },
  { word: 'ذئب', category: '🐾 الحيوانات (Animals)' },
  { word: 'ثعلب', category: '🐾 الحيوانات (Animals)' },
  { word: 'دب', category: '🐾 الحيوانات (Animals)' },
  { word: 'أرنب', category: '🐾 الحيوانات (Animals)' },
  { word: 'قطة', category: '🐾 الحيوانات (Animals)' },
  { word: 'كلب', category: '🐾 الحيوانات (Animals)' },
  { word: 'حصان', category: '🐾 الحيوانات (Animals)' },
  { word: 'جمل', category: '🐾 الحيوانات (Animals)' },
  { word: 'فيل', category: '🐾 الحيوانات (Animals)' },
  { word: 'زرافة', category: '🐾 الحيوانات (Animals)' },
  { word: 'قرد', category: '🐾 الحيوانات (Animals)' },
  { word: 'سلحفاة', category: '🐾 الحيوانات (Animals)' },
  { word: 'بطريق', category: '🐾 الحيوانات (Animals)' },
  { word: 'بومة', category: '🐾 الحيوانات (Animals)' },
  { word: 'نسر', category: '🐾 الحيوانات (Animals)' },
  { word: 'دلفين', category: '🐾 الحيوانات (Animals)' },
  { word: 'حوت', category: '🐾 الحيوانات (Animals)' },
  { word: 'تمساح', category: '🐾 الحيوانات (Animals)' },

  // ⚽ Sports
  { word: 'كرة القدم', category: '⚽ الرياضة (Sports)' },
  { word: 'كرة السلة', category: '⚽ الرياضة (Sports)' },
  { word: 'تنس', category: '⚽ الرياضة (Sports)' },
  { word: 'سباحة', category: '⚽ الرياضة (Sports)' },
  { word: 'جري', category: '⚽ الرياضة (Sports)' },
  { word: 'ملاكمة', category: '⚽ الرياضة (Sports)' },
  { word: 'كرة اليد', category: '⚽ الرياضة (Sports)' },
  { word: 'كرة الطائرة', category: '⚽ الرياضة (Sports)' },
  { word: 'رفع الأثقال', category: '⚽ الرياضة (Sports)' },
  { word: 'ركوب الخيل', category: '⚽ الرياضة (Sports)' },
  { word: 'سباق السيارات', category: '⚽ الرياضة (Sports)' },

  // 👕 Daily Life
  { word: 'ساعة', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'نظارة', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'حقيبة', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'مفتاح', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'قلم', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'دفتر', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'كتاب', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'كرسي', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'طاولة', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'مرآة', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'وسادة', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'بطانية', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'مظلة', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'مصباح', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'فرشاة أسنان', category: '👕 الحياة اليومية (Daily Life)' },
  { word: 'منشفة', category: '👕 الحياة اليومية (Daily Life)' },

  // 🎮 Entertainment
  { word: 'فيلم', category: '🎮 الترفيه والتسلية (Entertainment)' },
  { word: 'مسلسل', category: '🎮 الترفيه والتسلية (Entertainment)' },
  { word: 'لعبة', category: '🎮 الترفيه والتسلية (Entertainment)' },
  { word: 'موسيقى', category: '🎮 الترفيه والتسلية (Entertainment)' },
  { word: 'رواية', category: '🎮 الترفيه والتسلية (Entertainment)' },
  { word: 'مسرحية', category: '🎮 الترفيه والتسلية (Entertainment)' },
  { word: 'كرتون', category: '🎮 الترفيه والتسلية (Entertainment)' },
  { word: 'أنمي', category: '🎮 الترفيه والتسلية (Entertainment)' },
  { word: 'مغني', category: '🎮 الترفيه والتسلية (Entertainment)' },
  { word: 'ممثل', category: '🎮 الترفيه والتسلية (Entertainment)' },
  { word: 'يوتيوب', category: '🎮 الترفيه والتسلية (Entertainment)' },
  { word: 'بودكاست', category: '🎮 الترفيه والتسلية (Entertainment)' },

  // 🎓 School
  { word: 'امتحان', category: '🎓 الدراسة والمدرسة (School)' },
  { word: 'واجب', category: '🎓 الدراسة والمدرسة (School)' },
  { word: 'سبورة', category: '🎓 الدراسة والمدرسة (School)' },
  { word: 'معادلة', category: '🎓 الدراسة والمدرسة (School)' },
  { word: 'مختبر', category: '🎓 الدراسة والمدرسة (School)' },
  { word: 'شهادة', category: '🎓 الدراسة والمدرسة (School)' },
  { word: 'طالب', category: '🎓 الدراسة والمدرسة (School)' },
  { word: 'أستاذ', category: '🎓 الدراسة والمدرسة (School)' },
  { word: 'فصل', category: '🎓 الدراسة والمدرسة (School)' },
  { word: 'مقعد', category: '🎓 الدراسة والمدرسة (School)' },

  // 👑 Famous Things
  { word: 'برج إيفل', category: '👑 معالم شهيرة (Famous Things)' },
  { word: 'الأهرامات', category: '👑 معالم شهيرة (Famous Things)' },
  { word: 'سور الصين', category: '👑 معالم شهيرة (Famous Things)' },
  { word: 'تاج', category: '👑 معالم شهيرة (Famous Things)' },
  { word: 'عرش', category: '👑 معالم شهيرة (Famous Things)' },
  { word: 'خريطة', category: '👑 معالم شهيرة (Famous Things)' },
  { word: 'علم', category: '👑 معالم شهيرة (Famous Things)' },
  { word: 'كنز', category: '👑 معالم شهيرة (Famous Things)' },
  { word: 'ميدالية', category: '👑 معالم شهيرة (Famous Things)' },
  { word: 'كأس', category: '👑 معالم شهيرة (Famous Things)' },

  // 🇹🇳 Tunisian
  { word: 'بريك', category: '🇹🇳 تونسي (Tunisian)' },
  { word: 'لبلابي', category: '🇹🇳 تونسي (Tunisian)' },
  { word: 'مقروض', category: '🇹🇳 تونسي (Tunisian)' },
  { word: 'زلابية', category: '🇹🇳 تونسي (Tunisian)' },
  { word: 'عصيدة', category: '🇹🇳 تونسي (Tunisian)' },
  { word: 'شاشية', category: '🇹🇳 تونسي (Tunisian)' },
  { word: 'جبّة', category: '🇹🇳 تونسي (Tunisian)' },
  { word: 'رمضان', category: '🇹🇳 تونسي (Tunisian)' },
  { word: 'عيد', category: '🇹🇳 تونسي (Tunisian)' },
  { word: 'عرس', category: '🇹🇳 تونسي (Tunisian)' },
  { word: 'حنّة', category: '🇹🇳 تونسي (Tunisian)' },

  // 💎 Objects
  { word: 'ذهب', category: '💎 الأشياء والمعادن (Objects)' },
  { word: 'فضة', category: '💎 الأشياء والمعادن (Objects)' },
  { word: 'ألماس', category: '💎 الأشياء والمعادن (Objects)' },
  { word: 'حديد', category: '💎 الأشياء والمعادن (Objects)' },
  { word: 'نحاس', category: '💎 الأشياء والمعادن (Objects)' },
  { word: 'خاتم', category: '💎 الأشياء والمعادن (Objects)' },
  { word: 'قلادة', category: '💎 الأشياء والمعادن (Objects)' },
  { word: 'سلسلة', category: '💎 الأشياء والمعادن (Objects)' },
  { word: 'عملة', category: '💎 الأشياء والمعادن (Objects)' },
  { word: 'خزنة', category: '💎 الأشياء والمعادن (Objects)' }
];

class MrWhiteManager {
  constructor() {
    this.games = new Map(); // guildId => gameSession
    this.stats = {};
    this.loadStats();
  }

  // ─── STATISTICS PERSISTENCE ────────────────────────────────
  loadStats() {
    if (fs.existsSync(statsPath)) {
      try {
        this.stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
      } catch (err) {
        console.error('[MR WHITE STATS ERROR] Failed to parse mrwhite_stats.json:', err);
        this.stats = {};
      }
    }
  }

  saveStats() {
    try {
      fs.writeFileSync(statsPath, JSON.stringify(this.stats, null, 2), 'utf8');
    } catch (err) {
      console.error('[MR WHITE STATS ERROR] Failed to save mrwhite_stats.json:', err);
    }
  }

  getUserStats(guildId, userId) {
    if (!this.stats[guildId]) this.stats[guildId] = {};
    if (!this.stats[guildId][userId]) {
      this.stats[guildId][userId] = { games: 0, wins: 0, losses: 0, asWhite: 0 };
    }
    return this.stats[guildId][userId];
  }

  incrementStats(guildId, userId, field) {
    const userStats = this.getUserStats(guildId, userId);
    if (userStats[field] !== undefined) {
      userStats[field]++;
    }
    this.saveStats();
  }

  getLeaderboard(guildId, limit = 10) {
    if (!this.stats[guildId]) return [];
    return Object.entries(this.stats[guildId])
      .map(([userId, s]) => {
        const winRate = s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0;
        return { userId, ...s, winRate };
      })
      .sort((a, b) => b.wins - a.wins || b.games - a.games)
      .slice(0, limit);
  }

  // ─── GAME VOICE SESSION AUTOMATION ─────────────────────────
  async setPlayerMute(guild, userId, mute) {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member && member.voice.channelId) {
        await member.voice.setMute(mute, 'Mr. White Game voice control');
      }
    } catch (err) {
      console.warn(`[MR WHITE MUTE WARNING] Failed to set voice mute for ${userId}: ${err.message}`);
    }
  }

  async setMultipleMutes(guild, userIds, mute) {
    const promises = userIds.map(id => this.setPlayerMute(guild, id, mute));
    await Promise.all(promises);
  }

  // ─── GAME STATE TRANSITIONS ────────────────────────────────
  createGame(guildId, voiceChannelId, textChannelId, hostId, hostTag) {
    const session = {
      guildId,
      voiceChannelId,
      textChannelId,
      hostId,
      hostTag,
      status: 'LOBBY', // LOBBY, ROLE_REVEAL, PLAYING, DISCUSSION, VOTING, GUESSING
      players: new Map(), // userId => { userId, tag, role: 'CITIZEN'|'WHITE', active: true, viewed: false }
      secretWord: '',
      wordCategory: '',
      round: 0,
      turnIndex: 0,
      turnOrder: [],
      currentTurnTimer: null,
      discussionTimer: null,
      discussionVotes: new Set(),
      votes: new Map(), // voterUserId => targetUserId (or 'SKIP')
      gameMessageId: null,
      guessingUserId: null
    };
    this.games.set(guildId, session);
    return session;
  }

  getGame(guildId) {
    return this.games.get(guildId);
  }

  deleteGame(guildId) {
    const game = this.games.get(guildId);
    if (game) {
      if (game.currentTurnTimer) clearTimeout(game.currentTurnTimer);
      if (game.discussionTimer) clearTimeout(game.discussionTimer);
    }
    this.games.delete(guildId);
  }

  // ─── HELPER EMBEDS ─────────────────────────────────────────
  getLobbyEmbed(game) {
    const list = Array.from(game.players.values())
      .map((p, idx) => `\`${idx + 1}.\` <@${p.userId}> (${p.tag})`)
      .join('\n') || '*لا يوجد لاعبين منضمين حالياً.*';

    return new EmbedBuilder()
      .setColor(0x6366F1)
      .setTitle('🎮 لعبة Mr. White — غرفة الانتظار')
      .setDescription(
        `🏆 **Mr. White Voice Edition**\n` +
        `أهلاً بكم في لعبة الخداع الاجتماعي والاستنتاج الصوتي!\n\n` +
        `👑 **مضيف اللعبة:** <@${game.hostId}>\n` +
        `🔊 **الروم الصوتي:** <#${game.voiceChannelId}>\n` +
        `👥 **اللاعبين المنضمين (${game.players.size}/15):**\n${list}\n\n` +
        `⚡ **الحد الأدنى للبدء:** 4 لاعبين.\n` +
        `اضغط على زر **Join** للانضمام إلى المعركة!`
      )
      .setTimestamp()
      .setFooter({ text: 'Mr. White Voice Edition • akaza_senior' });
  }

  getHostButtons(game) {
    const isLobby = game.status === 'LOBBY';
    const isGuessing = game.status === 'GUESSING';
    const isReveal = game.status === 'ROLE_REVEAL';

    const row = new ActionRowBuilder();

    if (isLobby) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('mw_host_open_join')
          .setLabel('🎮 فتح الانضمام')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('mw_host_close_join')
          .setLabel('🚫 إغلاق الانضمام')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('mw_host_start_game')
          .setLabel('▶️ بدء المباراة')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(game.players.size < 4),
        new ButtonBuilder()
          .setCustomId('mw_host_end_game')
          .setLabel('⏹️ إنهاء')
          .setStyle(ButtonStyle.Secondary)
      );
    } else if (isReveal) {
      const allViewed = Array.from(game.players.values()).every(p => p.viewed);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('mw_host_start_first_round')
          .setLabel('▶️ بدء المباراة (Start Game)')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!allViewed),
        new ButtonBuilder()
          .setCustomId('mw_host_end_game')
          .setLabel('⏹️ إنهاء')
          .setStyle(ButtonStyle.Secondary)
      );
    } else if (isGuessing) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('mw_host_resolve_citizen_win')
          .setLabel('👥 فوز المواطنين')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('mw_host_resolve_white_win')
          .setLabel('🤫 فوز مستر وايت')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('mw_host_end_game')
          .setLabel('⏹️ إنهاء المباراة')
          .setStyle(ButtonStyle.Secondary)
      );
    } else {
      // General Playing Host Controls
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('mw_host_force_discussion')
          .setLabel('🔊 إنهاء النقاش')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(game.status !== 'DISCUSSION'),
        new ButtonBuilder()
          .setCustomId('mw_host_force_vote')
          .setLabel('🗳️ بدء التصويت')
          .setStyle(ButtonStyle.Success)
          .setDisabled(game.status !== 'VOTING'),
        new ButtonBuilder()
          .setCustomId('mw_host_force_next_turn')
          .setLabel('⏭️ تخطي الدور')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(game.status !== 'PLAYING'),
        new ButtonBuilder()
          .setCustomId('mw_host_end_game')
          .setLabel('⏹️ إنهاء')
          .setStyle(ButtonStyle.Secondary)
      );
    }
    return row;
  }

  getPlayerButtons(game) {
    const row = new ActionRowBuilder();

    if (game.status === 'LOBBY') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('mw_player_join')
          .setLabel('🎮 Join')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('mw_player_leave')
          .setLabel('🚪 Leave')
          .setStyle(ButtonStyle.Danger)
      );
    } else if (game.status === 'ROLE_REVEAL') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('mw_player_view_role')
          .setLabel('👁️ View Role')
          .setStyle(ButtonStyle.Primary)
      );
    } else if (game.status === 'PLAYING') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('mw_player_skip_turn')
          .setLabel('⏭️ Skip Turn')
          .setStyle(ButtonStyle.Secondary)
      );
    } else if (game.status === 'DISCUSSION') {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId('mw_player_vote_end_discussion')
          .setLabel(`🔊 إنهاء النقاش (${game.discussionVotes.size}/${Math.ceil(Array.from(game.players.values()).filter(p => p.active).length / 2)})`)
          .setStyle(ButtonStyle.Primary)
      );
    }
    return row;
  }

  // ─── GAME STATE MACHINE METHODS ────────────────────────────
  async startGame(client, guildId) {
    const game = this.getGame(guildId);
    if (!game || game.status !== 'LOBBY') return;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const count = game.players.size;
    if (count < 4) return;

    // A: Choose secret word & category
    const chosenObj = WORDS[Math.floor(Math.random() * WORDS.length)];
    game.secretWord = chosenObj.word;
    game.wordCategory = chosenObj.category;

    // B: Calculate Mr. White count
    let whiteCount = 1;
    if (count >= 6 && count <= 10) whiteCount = 2;
    else if (count >= 11 && count <= 15) whiteCount = 3;

    // C: Shuffle and assign roles
    const playerArray = Array.from(game.players.values());
    for (let i = playerArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playerArray[i], playerArray[j]] = [playerArray[j], playerArray[i]];
    }

    const whiteIndices = new Set();
    while (whiteIndices.size < whiteCount) {
      whiteIndices.add(Math.floor(Math.random() * count));
    }

    playerArray.forEach((p, idx) => {
      const role = whiteIndices.has(idx) ? 'WHITE' : 'CITIZEN';
      const actualPlayerObj = game.players.get(p.userId);
      actualPlayerObj.role = role;
      actualPlayerObj.active = true;
      actualPlayerObj.viewed = false;
    });

    game.status = 'ROLE_REVEAL';
    game.round = 0;

    await this.updateGameMessage(client, guildId);
  }

  async viewRole(client, guildId, userId) {
    const game = this.getGame(guildId);
    if (!game || game.status !== 'ROLE_REVEAL') return null;

    const player = game.players.get(userId);
    if (!player) return null;

    player.viewed = true;

    await this.updateGameMessage(client, guildId);

    // Return custom text to display ephemerally
    if (player.role === 'WHITE') {
      const allWhites = Array.from(game.players.values()).filter(p => p.role === 'WHITE').length;
      if (allWhites > 1) {
        return '🤫 **أنت Mr. White!**\n\n🤫 يوجد أفراد آخرون من Mr. White داخل المباراة لكن هوياتهم مجهولة.\nحاول الاندماج وتخمين الكلمة السرية من أوصافهم!';
      }
      return '🤫 **أنت Mr. White!**\n\nحاول الاندماج مع المواطنين، وتخمين الكلمة السرية من أوصافهم دون كشف هويتك!';
    } else {
      return `🔑 **كلمتك السرية هي:** "**${game.secretWord}**"\n🏷️ **فئة الكلمة:** ${game.wordCategory}\n\nصف كلمتك بحذر شديد دون كشفها لمستر وايت!`;
    }
  }

  async startRound(client, guildId, roundNum) {
    const game = this.getGame(guildId);
    if (!game) return;

    game.status = 'PLAYING';
    game.round = roundNum;
    game.turnIndex = 0;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const activePlayers = Array.from(game.players.values()).filter(p => p.active);
    
    const order = activePlayers.map(p => p.userId);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    game.turnOrder = order;

    const allPlayerIds = Array.from(game.players.values()).map(p => p.userId);
    await this.setMultipleMutes(guild, allPlayerIds, true);

    await this.startTurn(client, guildId);
  }

  async startTurn(client, guildId) {
    const game = this.getGame(guildId);
    if (!game || game.status !== 'PLAYING') return;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const activeUserId = game.turnOrder[game.turnIndex];
    if (!activeUserId) {
      await this.startDiscussion(client, guildId);
      return;
    }

    const allPlayerIds = Array.from(game.players.values()).map(p => p.userId);
    await this.setMultipleMutes(guild, allPlayerIds, true);
    await this.setPlayerMute(guild, activeUserId, false);

    await this.updateGameMessage(client, guildId);

    // Send a message tagging the user to tell them it's their turn
    try {
      const textChannel = await client.channels.fetch(game.textChannelId).catch(() => null);
      if (textChannel) {
        await textChannel.send({
          content: `🎙️ <@${activeUserId}> دورك الآن لوصف كلمتك! اضغط على زر **Skip Turn** عندما تنتهي.`
        });
      }
    } catch (err) {
      console.error('[MR WHITE] Failed to send turn ping:', err);
    }

    if (game.currentTurnTimer) clearTimeout(game.currentTurnTimer);
  }

  async nextTurn(client, guildId) {
    const game = this.getGame(guildId);
    if (!game || game.status !== 'PLAYING') return;

    if (game.currentTurnTimer) clearTimeout(game.currentTurnTimer);

    const activeUserId = game.turnOrder[game.turnIndex];
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (guild && activeUserId) {
      await this.setPlayerMute(guild, activeUserId, true);
    }

    game.turnIndex++;
    if (game.turnIndex < game.turnOrder.length) {
      await this.startTurn(client, guildId);
    } else {
      await this.startDiscussion(client, guildId);
    }
  }

  async skipTurn(client, guildId, userId) {
    const game = this.getGame(guildId);
    if (!game || game.status !== 'PLAYING') return false;

    const activeUserId = game.turnOrder[game.turnIndex];
    if (activeUserId !== userId) return false;

    await this.nextTurn(client, guildId);
    return true;
  }

  async startDiscussion(client, guildId) {
    const game = this.getGame(guildId);
    if (!game) return;

    game.status = 'DISCUSSION';
    game.discussionVotes.clear();

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const activeIds = Array.from(game.players.values()).filter(p => p.active).map(p => p.userId);
    await this.setMultipleMutes(guild, activeIds, false);

    await this.updateGameMessage(client, guildId);

    if (game.discussionTimer) clearTimeout(game.discussionTimer);
    game.discussionTimer = setTimeout(async () => {
      await this.startVoting(client, guildId);
    }, 45000);
  }

  async voteEndDiscussion(client, guildId, userId) {
    const game = this.getGame(guildId);
    if (!game || game.status !== 'DISCUSSION') return false;

    const player = game.players.get(userId);
    if (!player || !player.active) return false;

    game.discussionVotes.add(userId);

    const activeCount = Array.from(game.players.values()).filter(p => p.active).length;
    const required = Math.ceil(activeCount / 2);

    if (game.discussionVotes.size >= required) {
      if (game.discussionTimer) clearTimeout(game.discussionTimer);
      await this.startVoting(client, guildId);
    } else {
      await this.updateGameMessage(client, guildId);
    }
    return true;
  }

  async startVoting(client, guildId) {
    const game = this.getGame(guildId);
    if (!game) return;

    if (game.discussionTimer) clearTimeout(game.discussionTimer);
    if (game.currentTurnTimer) clearTimeout(game.currentTurnTimer);

    game.status = 'VOTING';
    game.votes.clear();

    await this.updateGameMessage(client, guildId);
  }

  async submitVote(client, guildId, voterId, targetId) {
    const game = this.getGame(guildId);
    if (!game || game.status !== 'VOTING') return false;

    const voter = game.players.get(voterId);
    if (!voter || !voter.active) return false;

    game.votes.set(voterId, targetId);

    const activeCount = Array.from(game.players.values()).filter(p => p.active).length;
    if (game.votes.size === activeCount) {
      await this.resolveVote(client, guildId);
    } else {
      await this.updateGameMessage(client, guildId);
    }
    return true;
  }

  async resolveVote(client, guildId) {
    const game = this.getGame(guildId);
    if (!game || game.status !== 'VOTING') return;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    const tallies = {};
    for (const targetId of game.votes.values()) {
      tallies[targetId] = (tallies[targetId] || 0) + 1;
    }

    let highestVoteCount = 0;
    let chosenTargetId = null;
    let tied = false;

    for (const [targetId, count] of Object.entries(tallies)) {
      if (count > highestVoteCount) {
        highestVoteCount = count;
        chosenTargetId = targetId;
        tied = false;
      } else if (count === highestVoteCount) {
        tied = true;
      }
    }

    const textChannel = await client.channels.fetch(game.textChannelId).catch(() => null);

    if (chosenTargetId === 'SKIP' || tied || !chosenTargetId) {
      if (textChannel) {
        const skipEmbed = new EmbedBuilder()
          .setColor(0xF59E0B)
          .setTitle('🗳️ تم تخطي التصويت')
          .setDescription('⚠️ لم يحصل أي لاعب على أغلبية الأصوات، أو فاز خيار تخطي التصويت!\nلا يتم إقصاء أحد في هذه الجولة. تبدأ جولة جديدة الآن...');
        await textChannel.send({ embeds: [skipEmbed] });
      }

      setTimeout(async () => {
        await this.startRound(client, guildId, game.round + 1);
      }, 4000);
      return;
    }

    const votedPlayer = game.players.get(chosenTargetId);
    if (!votedPlayer) return;

    votedPlayer.active = false;
    await this.setPlayerMute(guild, votedPlayer.userId, false);

    if (votedPlayer.role === 'CITIZEN') {
      if (textChannel) {
        const embed = new EmbedBuilder()
          .setColor(0xEF4444)
          .setTitle('💀 إقصاء مواطن!')
          .setDescription(`☠️ لقد تم إقصاء المواطن <@${votedPlayer.userId}> بناءً على تصويت الأغلبية!\nالمباراة مستمرة...`);
        await textChannel.send({ embeds: [embed] });
      }

      const activeCitizens = Array.from(game.players.values()).filter(p => p.role === 'CITIZEN' && p.active).length;
      if (activeCitizens === 0) {
        await this.endGameWithWinner(client, guildId, 'WHITE');
      } else {
        setTimeout(async () => {
          await this.startRound(client, guildId, game.round + 1);
        }, 5000);
      }

    } else if (votedPlayer.role === 'WHITE') {
      const activeWhites = Array.from(game.players.values()).filter(p => p.role === 'WHITE' && p.active).length;

      if (activeWhites > 0) {
        if (textChannel) {
          const embed = new EmbedBuilder()
            .setColor(0x10B981)
            .setTitle('🎉 كشف Mr. White!')
            .setDescription(`🔍 تم كشف وتصفية أفراد Mr. White: <@${votedPlayer.userId}>!\nولكن انتبهوا! لا يزال هناك Mr. White آخر متخفٍ داخل المباراة!`);
          await textChannel.send({ embeds: [embed] });
        }

        setTimeout(async () => {
          await this.startRound(client, guildId, game.round + 1);
        }, 5000);

      } else {
        game.status = 'GUESSING';
        game.guessingUserId = votedPlayer.userId;

        const allIds = Array.from(game.players.values()).map(p => p.userId);
        await this.setMultipleMutes(guild, allIds, true);
        await this.setPlayerMute(guild, votedPlayer.userId, false);

        await this.updateGameMessage(client, guildId);
      }
    }
  }

  async resolveGuess(client, guildId, mrWhiteWin) {
    const game = this.getGame(guildId);
    if (!game || game.status !== 'GUESSING') return;

    if (mrWhiteWin) {
      await this.endGameWithWinner(client, guildId, 'WHITE');
    } else {
      await this.endGameWithWinner(client, guildId, 'CITIZENS');
    }
  }

  async endGameWithWinner(client, guildId, winningTeam) {
    const game = this.getGame(guildId);
    if (!game) return;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    const textChannel = await client.channels.fetch(game.textChannelId).catch(() => null);

    const playersArray = Array.from(game.players.values());

    const winners = [];
    const losers = [];
    let title = '';
    let color = 0;
    let description = '';

    if (winningTeam === 'WHITE') {
      title = '🤫 فوز Mr. White!';
      color = 0xEF4444;
      description = `🎉 نجح **Mr. White** في الخداع الاجتماعي أو تخمين الكلمة السرية الصحيحة: "**${game.secretWord}**" للفوز بالمباراة!`;

      for (const p of playersArray) {
        this.incrementStats(guildId, p.userId, 'games');
        if (p.role === 'WHITE') {
          this.incrementStats(guildId, p.userId, 'wins');
          this.incrementStats(guildId, p.userId, 'asWhite');
          winners.push(p.userId);
          const member = guild ? await guild.members.fetch(p.userId).catch(() => null) : null;
          if (member) {
            await levelingManager.awardVoiceXp(guild, member, 1000);
          }
        } else {
          this.incrementStats(guildId, p.userId, 'losses');
          losers.push(p.userId);
        }
      }
    } else {
      title = '👥 فوز المواطنين (Citizens Win!)';
      color = 0x10B981;
      description = `🎉 نجح المواطنون في كشف جميع أفراد **Mr. White** وفشل مستر وايت في تخمين الكلمة السرية الصحيحة: "**${game.secretWord}**"!`;

      for (const p of playersArray) {
        this.incrementStats(guildId, p.userId, 'games');
        if (p.role === 'CITIZEN') {
          this.incrementStats(guildId, p.userId, 'wins');
          winners.push(p.userId);
          const member = guild ? await guild.members.fetch(p.userId).catch(() => null) : null;
          if (member) {
            await levelingManager.awardVoiceXp(guild, member, 500);
          }
        } else {
          this.incrementStats(guildId, p.userId, 'losses');
          this.incrementStats(guildId, p.userId, 'asWhite');
          losers.push(p.userId);
        }
      }
    }

    if (textChannel) {
      const finalEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(
          `${description}\n\n` +
          `🏆 **الفائزون (تم منحهم المكافأة):**\n${winners.map(id => `<@${id}>`).join(', ') || 'لا أحد'}\n\n` +
          `📊 **الكلمة السرية:** "**${game.secretWord}**"`
        )
        .setTimestamp()
        .setFooter({ text: 'تهانينا لجميع اللاعبين! • Mr. White Voice Edition' });

      await textChannel.send({ embeds: [finalEmbed] });
    }

    if (guild) {
      const allIds = playersArray.map(p => p.userId);
      await this.setMultipleMutes(guild, allIds, false);
    }

    await logger.success(client, `🎮 مباراة Mr. White انتهت`, [
      { name: 'النتيجة', value: winningTeam === 'WHITE' ? 'فوز مستر وايت' : 'فوز المواطنين' },
      { name: 'الكلمة السرية', value: game.secretWord },
      { name: 'الفائزون', value: winners.map(id => `<@${id}>`).join(', ') || 'لا أحد' }
    ]);

    // ─── POST MATCH STATS TO CONFIGURED STATS CHANNEL ─────────
    try {
      const statsChannelId = config.mrWhiteStatsChannelId;
      if (statsChannelId) {
        const statsChannel = await client.channels.fetch(statsChannelId).catch(() => null);
        if (statsChannel && statsChannel.isTextBased()) {

          // ── 1. Match Result Summary Card ──────────────────────
          const matchEmbed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${winningTeam === 'WHITE' ? '🤫' : '👥'} نتيجة المباراة — Mr. White Voice Edition`)
            .setDescription(description)
            .addFields(
              {
                name: `🏆 الفائزون (${winningTeam === 'WHITE' ? `+1,000 XP` : `+500 XP`})`,
                value: winners.map(id => `<@${id}>`).join('\n') || '*لا أحد*',
                inline: true
              },
              {
                name: '💀 الخاسرون',
                value: losers.map(id => `<@${id}>`).join('\n') || '*لا أحد*',
                inline: true
              },
              {
                name: '🔑 الكلمة السرية',
                value: `\`${game.secretWord}\` — ${game.wordCategory}`,
                inline: false
              },
              {
                name: '👥 اللاعبون الكلي',
                value: `\`${playersArray.length} لاعب\``,
                inline: true
              },
              {
                name: '🔄 الجولات',
                value: `\`${game.round} جولة\``,
                inline: true
              }
            )
            .setTimestamp()
            .setFooter({ text: `Mr. White Voice Edition • akaza_senior` });

          // ── 2. Updated Server Leaderboard ─────────────────────
          const leaderboard = this.getLeaderboard(guildId, 10);

          let lbDescription = '';
          if (leaderboard.length === 0) {
            lbDescription = '*لا توجد إحصائيات مسجلة بعد.*';
          } else {
            const medals = ['🥇', '🥈', '🥉'];
            const rows = await Promise.all(
              leaderboard.map(async (entry, idx) => {
                const medal = medals[idx] ?? '🏅';
                // Resolve display name if possible
                let displayName = `<@${entry.userId}>`;
                try {
                  const m = await guild.members.fetch(entry.userId).catch(() => null);
                  if (m) displayName = `**${m.displayName}**`;
                } catch (_) {}

                return (
                  `${medal} **#${idx + 1}** ${displayName}\n` +
                  `> 🏆 \`${entry.wins}\` فوز  |  🎮 \`${entry.games}\` مباراة  |  📈 \`${entry.winRate}%\` نسبة الفوز  |  🤫 \`${entry.asWhite}\` مرة مستر وايت`
                );
              })
            );
            lbDescription = rows.join('\n\n');
          }

          const lbEmbed = new EmbedBuilder()
            .setColor(0xF59E0B)
            .setTitle('🏅 لوحة متصدري لعبة Mr. White — محدّثة')
            .setDescription(lbDescription)
            .setTimestamp()
            .setFooter({ text: 'يتم تحديث هذه اللوحة تلقائياً بعد كل مباراة • Mr. White Voice Edition' });

          await statsChannel.send({ embeds: [matchEmbed, lbEmbed] });
        }
      }
    } catch (statsErr) {
      console.error('[MR WHITE] Failed to post match stats to stats channel:', statsErr);
    }

    this.deleteGame(guildId);
  }


  // ─── RENDERING MAIN CARD EMBEDS ────────────────────────────
  async updateGameMessage(client, guildId) {
    const game = this.getGame(guildId);
    if (!game) return;

    const channel = await client.channels.fetch(game.textChannelId).catch(() => null);
    if (!channel) return;

    const activePlayers = Array.from(game.players.values()).filter(p => p.active);
    const allPlayers = Array.from(game.players.values());

    let embed;

    if (game.status === 'LOBBY') {
      embed = this.getLobbyEmbed(game);
    } else {
      embed = new EmbedBuilder().setTimestamp();
    }

    if (game.status === 'ROLE_REVEAL') {
      const revealList = allPlayers
        .map(p => `• <@${p.userId}>: ${p.viewed ? '🟢 **تمت المشاهدة**' : '🔴 **في الانتظار...**'}`)
        .join('\n');

      const allViewed = allPlayers.every(p => p.viewed);
      const instructionText = allViewed
        ? '✅ لقد شاهد جميع اللاعبين أدوارهم! بإمكان مضيف اللعبة الآن الضغط على زر بدء المباراة أدناه لبدء مرحلة الوصف.'
        : '⚠️ لن تبدأ المباراة حتى يقوم جميع اللاعبين المشاركين بمشاهدة أدوارهم.';

      embed
        .setColor(0x8B5CF6)
        .setTitle('👁️ Mr. White — مرحلة كشف الأدوار')
        .setDescription(
          `الرجاء من جميع اللاعبين الضغط على زر **View Role** أدناه لمعرفة دورهم السري في هذه المباراة!\n\n` +
          `🔒 **حالة اللاعبين:**\n${revealList}\n\n` +
          `${instructionText}`
        );

    } else if (game.status === 'PLAYING') {
      const activeUserId = game.turnOrder[game.turnIndex];
      const turnList = game.turnOrder
        .map((id, idx) => {
          const isCurrent = idx === game.turnIndex;
          return `${isCurrent ? '👉 ' : '• '}${idx < game.turnIndex ? '✅' : '⏳'} <@${id}>`;
        })
        .join('\n');

      embed
        .setColor(0x6366F1)
        .setTitle(`🎤 مرحلة الوصف — الجولة ${game.round}`)
        .setDescription(
          `🎤 **المايك مفتوح للاعب الحالي فقط للوصف!**\n` +
          `يتم كتم صوت بقية اللاعبين تلقائياً بواسطة البوت لضمان جودة الأداء.\n\n` +
          `🎙️ **اللاعب الحالي:** <@${activeUserId}>\n` +
          `إذا انتهيت من الوصف، اضغط على زر **Skip Turn** أدناه لتمرير المايك للاعب التالي.\n\n` +
          `📋 **ترتيب الأدوار:**\n${turnList}`
        );

    } else if (game.status === 'DISCUSSION') {
      const votesList = allPlayers
        .filter(p => p.active)
        .map(p => `• <@${p.userId}>: ${game.discussionVotes.has(p.userId) ? '✅ موافق' : '⏳ يفكر...'}`)
        .join('\n');

      embed
        .setColor(0xF59E0B)
        .setTitle(`🔊 مرحلة النقاش الحر — الجولة ${game.round}`)
        .setDescription(
          `🔓 **تم فتح المايكات للجميع الآن!**\n` +
          `تحدثوا بحرية وناقشوا الأوصاف والأدلة لتحديد هوية مستر وايت المتخفي.\n\n` +
          `⏳ **الوقت:** 45 ثانية.\n` +
          `يمكنكم إنهاء النقاش مبكراً عبر التصويت بالضغط على زر **End Discussion Vote**.\n\n` +
          `🗳️ **أصوات إنهاء النقاش (${game.discussionVotes.size}/${Math.ceil(activePlayers.length / 2)}):**\n${votesList}`
        );

    } else if (game.status === 'VOTING') {
      const list = allPlayers
        .filter(p => p.active)
        .map(p => `• <@${p.userId}>: ${game.votes.has(p.userId) ? '🟢 **تم التصويت**' : '🔴 **في الانتظار...**'}`)
        .join('\n');

      embed
        .setColor(0xDC2626)
        .setTitle('🗳️ مرحلة التصويت — من هو Mr. White؟')
        .setDescription(
          `❓ **صوتوا الآن لإقصاء اللاعب المشتبه به!**\n` +
          `اضغطوا على اسم اللاعب أدناه، أو اختاروا تجاوز التصويت لتخطي هذه الجولة.\n\n` +
          `🗳️ **حالة التصويت (${game.votes.size}/${activePlayers.length}):**\n${list}`
        );

    } else if (game.status === 'GUESSING') {
      embed
        .setColor(0xDC2626)
        .setTitle('🎯 فرصة التخمين الأخيرة لـ Mr. White!')
        .setDescription(
          `🎉 **لقد تم كشف Mr. White:** <@${game.guessingUserId}>\n\n` +
          `🎙️ **المايك مفتوح له فقط الآن!**\n` +
          `🤫 لديه **30 ثانية** لتخمين الكلمة السرية الصحيحة شفهياً في الروم الصوتي للفوز بالمباراة.\n\n` +
          `👑 **لوحة الحسم للـ Host:**\n` +
          `الرجاء من مضيف اللعبة تأكيد النتيجة باستخدام الأزرار أدناه بناءً على الكلمة التي خمنها اللاعب.`
        );
    }

    const hostButtons = this.getHostButtons(game);
    const playerButtons = this.getPlayerButtons(game);

    const components = [];
    if (hostButtons.components.length > 0) components.push(hostButtons);
    
    if (game.status === 'VOTING') {
      const activeP = allPlayers.filter(p => p.active);
      let row = new ActionRowBuilder();
      const rows = [row];

      activeP.forEach((p, idx) => {
        if (row.components.length === 5) {
          row = new ActionRowBuilder();
          rows.push(row);
        }
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`mw_vote_target_${p.userId}`)
            .setLabel(`🎯 ${p.tag.slice(0, 15)}`)
            .setStyle(ButtonStyle.Danger)
        );
      });

      let skipRow = rows[rows.length - 1];
      if (skipRow.components.length === 5) {
        skipRow = new ActionRowBuilder();
        rows.push(skipRow);
      }
      skipRow.addComponents(
        new ButtonBuilder()
          .setCustomId('mw_vote_skip')
          .setLabel('⏭️ Skip Vote')
          .setStyle(ButtonStyle.Secondary)
      );

      components.push(...rows);
    } else {
      if (playerButtons.components.length > 0) components.push(playerButtons);
    }

    try {
      if (game.gameMessageId) {
        const msg = await channel.messages.fetch(game.gameMessageId).catch(() => null);
        if (msg) {
          await msg.edit({ embeds: [embed], components });
          return;
        }
      }

      const msg = await channel.send({ embeds: [embed], components });
      game.gameMessageId = msg.id;
    } catch (err) {
      console.error('[MR WHITE RENDER ERROR] Failed to send/edit game message:', err);
    }
  }
}

module.exports = new MrWhiteManager();
