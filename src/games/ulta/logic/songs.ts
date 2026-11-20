import type { Rng } from "@/party/logic/random";

/**
 * "Suggest one": well-known songs to sing, mostly Bollywood across the decades, plus a
 * few English and regional ones. Titles and where they're from only: no lyrics and no
 * music anywhere in the app. No anthems and no devotional songs, and nothing a cousin's
 * grandparent would wince at.
 */

export type SongKind = "bollywood" | "english" | "regional";

export type Song = {
  title: string;
  /** The film, or the singer for a song that isn't from one. */
  from: string;
  kind: SongKind;
};

const bollywood = (from: string, ...titles: string[]): Song[] => titles.map((title) => ({ title, from, kind: "bollywood" }));
const english = (from: string, ...titles: string[]): Song[] => titles.map((title) => ({ title, from, kind: "english" }));
const regional = (from: string, ...titles: string[]): Song[] => titles.map((title) => ({ title, from, kind: "regional" }));

export const SONGS: readonly Song[] = [
  // The 50s and 60s
  ...bollywood("Shree 420", "Mera Joota Hai Japani", "Ichak Dana Bichak Dana", "Pyar Hua Ikrar Hua"),
  ...bollywood("Aasha", "Eena Meena Deeka"),
  ...bollywood("Pyaasa", "Sar Jo Tera Chakraye"),
  ...bollywood("Howrah Bridge", "Mera Naam Chin Chin Chu"),
  ...bollywood("Boot Polish", "Nanhe Munne Bachche"),
  ...bollywood("Naya Daur", "Yeh Desh Hai Veer Jawanon Ka"),
  ...bollywood("Anari", "Kisi Ki Muskurahaton Pe"),
  ...bollywood("Mughal-e-Azam", "Pyar Kiya To Darna Kya"),
  ...bollywood("Chaudhvin Ka Chand", "Chaudhvin Ka Chand"),
  ...bollywood("Woh Kaun Thi?", "Lag Ja Gale"),
  ...bollywood("Bhoot Bungla", "Aao Twist Karein"),
  ...bollywood("Guide", "Gaata Rahe Mera Dil", "Aaj Phir Jeene Ki Tamanna Hai", "Tere Mere Sapne"),
  ...bollywood("Upkar", "Mere Desh Ki Dharti"),
  ...bollywood("Padosan", "Ek Chatur Naar", "Mere Samne Wali Khidki Mein"),
  ...bollywood("Aradhana", "Mere Sapno Ki Rani", "Kora Kagaz Tha Yeh Man Mera"),

  // The 70s
  ...bollywood("Mera Naam Joker", "Jaane Kahan Gaye Woh Din"),
  ...bollywood("Kati Patang", "Yeh Shaam Mastani", "Yeh Jo Mohabbat Hai"),
  ...bollywood("Haathi Mere Saathi", "Chal Chal Chal Mere Haathi"),
  ...bollywood("Andaz", "Zindagi Ek Safar Hai Suhana"),
  ...bollywood("Mere Jeevan Saathi", "O Mere Dil Ke Chain"),
  ...bollywood("Seeta Aur Geeta", "O Saathi Chal"),
  ...bollywood("Yaadon Ki Baaraat", "Chura Liya Hai Tumne Jo Dil Ko"),
  ...bollywood("Blackmail", "Pal Pal Dil Ke Paas"),
  ...bollywood("Aandhi", "Tere Bina Zindagi Se"),
  ...bollywood("Sholay", "Yeh Dosti", "Mehbooba Mehbooba", "Holi Ke Din"),
  ...bollywood("Kabhi Kabhie", "Kabhi Kabhi Mere Dil Mein"),
  ...bollywood("Chalte Chalte", "Chalte Chalte"),
  ...bollywood("Hum Kisise Kum Naheen", "Kya Hua Tera Wada", "Bachna Ae Haseeno"),
  ...bollywood("Don", "Khaike Paan Banaraswala", "Yeh Mera Dil"),

  // The 80s
  ...bollywood("Shaan", "Yamma Yamma"),
  ...bollywood("Silsila", "Dekha Ek Khwab", "Rang Barse"),
  ...bollywood("Kranti", "Zindagi Ki Na Toote Ladi"),
  ...bollywood("Disco Dancer", "I Am a Disco Dancer", "Jimmy Jimmy Aaja"),
  ...bollywood("Masoom", "Tujhse Naraz Nahi Zindagi", "Lakdi Ki Kaathi"),
  ...bollywood("Pukar", "Bachke Rehna Re Baba"),
  ...bollywood("Mr. India", "Hawa Hawai"),
  ...bollywood("Tezaab", "Ek Do Teen"),
  ...bollywood("Qayamat Se Qayamat Tak", "Papa Kehte Hain"),
  ...bollywood("Ram Lakhan", "My Name Is Lakhan"),
  ...bollywood("Maine Pyar Kiya", "Dil Deewana", "Mere Rang Mein Rangne Wali"),

  // The 90s
  ...bollywood("Jurm", "Jab Koi Baat Bigad Jaye"),
  ...bollywood("Love", "Saathiya Tune Kya Kiya"),
  ...bollywood("Thanedaar", "Tamma Tamma Loge"),
  ...bollywood("Jo Jeeta Wohi Sikandar", "Pehla Nasha"),
  ...bollywood("Darr", "Jaadu Teri Nazar"),
  ...bollywood("1942: A Love Story", "Ek Ladki Ko Dekha", "Pyaar Hua Chupke Se"),
  ...bollywood("Mohra", "Tu Cheez Badi Hai Mast Mast"),
  ...bollywood("Main Khiladi Tu Anari", "Chura Ke Dil Mera"),
  ...bollywood("Yeh Dillagi", "Ole Ole"),
  ...bollywood("Hum Aapke Hain Koun..!", "Didi Tera Devar Deewana"),
  ...bollywood("Dilwale Dulhania Le Jayenge", "Tujhe Dekha To", "Mere Khwabon Mein", "Ruk Ja O Dil Deewane", "Ghar Aaja Pardesi"),
  ...bollywood("Raja Hindustani", "Pardesi Pardesi", "Aaye Ho Meri Zindagi Mein"),
  ...bollywood("Pardes", "I Love My India"),
  ...bollywood("Border", "Sandese Aate Hain"),
  ...bollywood("Dil To Pagal Hai", "Dil To Pagal Hai", "Bholi Si Surat", "Koi Ladki Hai"),
  ...bollywood("Dil Se", "Chaiyya Chaiyya"),
  ...bollywood("Kuch Kuch Hota Hai", "Kuch Kuch Hota Hai", "Koi Mil Gaya", "Ladki Badi Anjani Hai", "Saajanji Ghar Aaye"),
  ...bollywood("Taal", "Taal Se Taal Mila"),
  ...bollywood("Hum Dil De Chuke Sanam", "Chand Chupa Badal Mein", "Dholi Taaro", "Nimbooda", "Aankhon Ki Gustakhiyan"),
  ...bollywood("Hum Saath-Saath Hain", "Chhote Chhote Bhaiyon Ke Bade Bhaiya"),

  // The 2000s
  ...bollywood("Phir Bhi Dil Hai Hindustani", "Phir Bhi Dil Hai Hindustani"),
  ...bollywood("Kaho Naa... Pyaar Hai", "Kaho Naa Pyaar Hai", "Ek Pal Ka Jeena"),
  ...bollywood("Lagaan", "Mitwa", "Chale Chalo", "Ghanan Ghanan"),
  ...bollywood("Kabhi Khushi Kabhie Gham", "Kabhi Khushi Kabhie Gham", "Bole Chudiyan", "Say Shava Shava", "Suraj Hua Maddham"),
  ...bollywood("Dil Chahta Hai", "Dil Chahta Hai", "Woh Ladki Hai Kahan", "Koi Kahe Kehta Rahe"),
  ...bollywood("Rehnaa Hai Terre Dil Mein", "Zara Zara"),
  ...bollywood("Devdas", "Dola Re Dola", "Silsila Ye Chaahat Ka"),
  ...bollywood("Kal Ho Naa Ho", "Kal Ho Naa Ho", "It's the Time to Disco", "Maahi Ve"),
  ...bollywood("Main Hoon Na", "Main Hoon Na", "Tumse Milke Dil Ka Jo Haal"),
  ...bollywood("Dhoom", "Dhoom Machale"),
  ...bollywood("Hum Tum", "Hum Tum"),
  ...bollywood("Mujhse Shaadi Karogi", "Mujhse Shaadi Karogi"),
  ...bollywood("Lakshya", "Lakshya", "Kandhon Se Milte Hain Kandhe"),
  ...bollywood("Swades", "Yeh Tara Woh Tara", "Yun Hi Chala Chal", "Ye Jo Des Hai Tera"),
  ...bollywood("Bunty Aur Babli", "Kajra Re"),
  ...bollywood("Rang De Basanti", "Rang De Basanti", "Masti Ki Paathshaala", "Khalbali"),
  ...bollywood("Don (2006)", "Main Hoon Don", "Aaj Ki Raat"),
  ...bollywood("Kabhi Alvida Naa Kehna", "Where's the Party Tonight"),
  ...bollywood("Jab We Met", "Mauja Hi Mauja", "Nagada Nagada", "Aao Milo Chalein", "Tum Se Hi", "Yeh Ishq Hai"),
  ...bollywood("Chak De! India", "Chak De India"),
  ...bollywood("Om Shanti Om", "Aankhon Mein Teri", "Dhoom Taana", "Dard-e-Disco"),
  ...bollywood("Ta Ra Rum Pum", "Hey Shona"),
  ...bollywood("Aaja Nachle", "Aaja Nachle"),
  ...bollywood("Jaane Tu... Ya Jaane Na", "Pappu Can't Dance", "Kabhi Kabhi Aditi"),
  ...bollywood("Rock On!!", "Rock On!!"),
  ...bollywood("Dostana", "Desi Girl"),
  ...bollywood("Rab Ne Bana Di Jodi", "Haule Haule", "Dance Pe Chance"),
  ...bollywood("Delhi-6", "Masakali"),
  ...bollywood("Slumdog Millionaire", "Jai Ho"),
  ...bollywood("3 Idiots", "All Izz Well", "Give Me Some Sunshine", "Zoobi Doobi"),
  ...bollywood("Ajab Prem Ki Ghazab Kahani", "Tu Jaane Na"),
  ...bollywood("Bhool Bhulaiyaa", "Ami Je Tomar"),

  // The 2010s
  ...bollywood("Band Baaja Baaraat", "Ainvayi Ainvayi"),
  ...bollywood("Zindagi Na Milegi Dobara", "Señorita", "Ik Junoon"),
  ...bollywood("Ready", "Dhinka Chika"),
  ...bollywood("Bodyguard", "Teri Meri"),
  ...bollywood("Rockstar", "Sadda Haq", "Nadaan Parindey"),
  ...bollywood("Agent Vinod", "Raabta"),
  ...bollywood("Student of the Year", "Ishq Wala Love", "The Disco Song"),
  ...bollywood("Aashiqui 2", "Tum Hi Ho", "Sun Raha Hai Na Tu"),
  ...bollywood("Yeh Jawaani Hai Deewani", "Balam Pichkari", "Badtameez Dil", "Ilahi"),
  ...bollywood("Chennai Express", "Lungi Dance"),
  ...bollywood("Goliyon Ki Raasleela Ram-Leela", "Nagada Sang Dhol"),
  ...bollywood("Queen", "London Thumakda"),
  ...bollywood("Gunday", "Tune Maari Entriyaan"),
  ...bollywood("Ek Villain", "Galliyan"),
  ...bollywood("Khoobsurat", "Abhi Toh Party Shuru Hui Hai"),
  ...bollywood("Humpty Sharma Ki Dulhania", "Saturday Saturday"),
  ...bollywood("Dil Dhadakne Do", "Gallan Goodiyaan"),
  ...bollywood("Dilwale", "Gerua"),
  ...bollywood("Tamasha", "Matargashti", "Agar Tum Saath Ho"),
  ...bollywood("Bajirao Mastani", "Malhari", "Pinga", "Deewani Mastani"),
  ...bollywood("Kapoor & Sons", "Kar Gayi Chull"),
  ...bollywood("Baar Baar Dekho", "Kala Chashma"),
  ...bollywood("Ae Dil Hai Mushkil", "Channa Mereya", "Bulleya"),
  ...bollywood("Dangal", "Dangal", "Haanikaarak Bapu"),
  ...bollywood("Befikre", "Ude Dil Befikre"),
  ...bollywood("Jab Harry Met Sejal", "Hawayein"),
  ...bollywood("Tiger Zinda Hai", "Swag Se Swagat", "Dil Diyan Gallan"),
  ...bollywood("Padmaavat", "Ghoomar"),
  ...bollywood("Loveyatri", "Chogada"),
  ...bollywood("Sonu Ke Titu Ki Sweety", "Bom Diggy Diggy"),
  ...bollywood("Stree", "Kamariya"),
  ...bollywood("Sanju", "Kar Har Maidaan Fateh"),
  ...bollywood("Raazi", "Ae Watan"),
  ...bollywood("Simmba", "Aankh Marey"),
  ...bollywood("Gully Boy", "Apna Time Aayega"),
  ...bollywood("Kesari", "Teri Mitti"),
  ...bollywood("War", "Ghungroo"),

  // The 2020s
  ...bollywood("Love Aaj Kal", "Shayad"),
  ...bollywood("Shershaah", "Raataan Lambiyan"),
  ...bollywood("Brahmastra", "Kesariya"),
  ...bollywood("Pathaan", "Jhoome Jo Pathaan"),
  ...bollywood("Rocky Aur Rani Kii Prem Kahaani", "Tum Kya Mile", "What Jhumka?"),
  ...bollywood("Jawan", "Chaleya"),

  // Regional hits the whole table knows
  ...regional("Daler Mehndi", "Tunak Tunak Tun", "Bolo Ta Ra Ra"),
  ...regional("Panjabi MC", "Mundian To Bach Ke"),
  ...regional("Diljit Dosanjh", "Proper Patola"),
  ...regional("Guru Randhawa", "High Rated Gabru"),
  ...regional("The Doorbeen", "Lamberghini"),
  ...regional("Laung Laachi", "Laung Laachi"),
  ...regional("Sairat", "Zingaat"),
  ...regional("3", "Why This Kolaveri Di"),
  ...regional("Roja", "Chinna Chinna Aasai"),
  ...regional("Ghilli", "Appadi Podu"),
  ...regional("Maari 2", "Rowdy Baby"),
  ...regional("Master", "Vaathi Coming"),
  ...regional("Beast", "Arabic Kuthu"),
  ...regional("Jailer", "Kaavaalaa"),
  ...regional("RRR", "Naatu Naatu"),
  ...regional("Pushpa", "Srivalli", "Saami Saami"),
  ...regional("Ala Vaikunthapurramuloo", "Butta Bomma", "Ramuloo Ramulaa"),
  ...regional("Velipadinte Pusthakam", "Jimikki Kammal"),
  ...regional("Kirik Party", "Belageddu"),

  // English (and a few more languages) everyone's heard
  ...english("A birthday classic", "Happy Birthday to You"),
  ...english("A nursery rhyme", "Twinkle Twinkle Little Star", "Old MacDonald Had a Farm"),
  ...english("A winter classic", "Jingle Bells"),
  ...english("Pinkfong", "Baby Shark"),
  ...english("Frozen", "Let It Go"),
  ...english("The Lion King", "Hakuna Matata"),
  ...english("Moana", "How Far I'll Go"),
  ...english("Encanto", "We Don't Talk About Bruno"),
  ...english("Queen", "We Will Rock You", "We Are the Champions", "Bohemian Rhapsody"),
  ...english("The Beatles", "Yellow Submarine", "Hey Jude"),
  ...english("ABBA", "Dancing Queen", "Mamma Mia"),
  ...english("Michael Jackson", "Billie Jean", "Beat It"),
  ...english("Shakira", "Waka Waka"),
  ...english("Ed Sheeran", "Shape of You", "Perfect"),
  ...english("Luis Fonsi", "Despacito"),
  ...english("PSY", "Gangnam Style"),
  ...english("BTS", "Dynamite", "Butter"),
  ...english("Pharrell Williams", "Happy"),
  ...english("Imagine Dragons", "Believer"),
  ...english("Katy Perry", "Roar", "Firework"),
  ...english("Taylor Swift", "Shake It Off"),
];

/**
 * A song nobody has had yet in this room, or from all of them again once every song has
 * been used. `used` holds titles (with where they're from), so a list that grows later
 * keeps old rooms' history.
 */
export function drawSong(used: readonly string[], rng: Rng): Song {
  const seen = new Set(used);
  const fresh = SONGS.filter((song) => !seen.has(songKey(song)));
  const pool = fresh.length > 0 ? fresh : SONGS;
  return pool[Math.floor(rng() * pool.length)];
}

/** A song's id in a room's used list: its title and where it's from. */
export function songKey(song: Song): string {
  return `${song.title} · ${song.from}`;
}
