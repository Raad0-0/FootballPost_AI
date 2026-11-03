"""Google Gemini AI integration service for generating football club post drafts.

Features:
- Single request produces 3 distinct variations (Short, Story, Discussion/Comment-magnet).
- Supports tones: Hype, Banter, Professional.
- Supports languages: English, Banglish (Bengali transliteration), Bengali (বাংলা).
- Appends workspace default hashtags deterministically (saves Gemini tokens & ensures consistency).
- Clean fallback to template generator if no API key is provided or if network fails.
"""

import json
import logging
from typing import Any
import httpx

from app.core.config import settings

logger = logging.getLogger("clubpost.gemini")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"


def _format_hashtags(hashtags: str | None) -> str:
    """Format hashtags to append cleanly with double newline if present."""
    if not hashtags or not hashtags.strip():
        return ""
    tags = hashtags.strip()
    return f"\n\n{tags}"


def _get_fallback_variations(
    context_type: str,
    context_data: dict[str, Any],
    tone: str,
    language: str,
    default_hashtags: str | None,
) -> dict[str, str]:
    """Graceful deterministic template fallback if Gemini API is unavailable."""
    team = context_data.get("team") or context_data.get("home_team") or "Our Club"
    opponent = context_data.get("opponent") or context_data.get("away_team") or "Opponent"
    minute = context_data.get("minute", "")
    player = context_data.get("player") or context_data.get("player_name") or "Player"
    score = context_data.get("score") or f"{context_data.get('home_score', 0)}-{context_data.get('away_score', 0)}"
    headline = context_data.get("headline", "")
    tag_suffix = _format_hashtags(default_hashtags)

    if context_type == "goal":
        if tone == "banter":
            short = f"And that's how it's done! {player} scores in the {minute}'! {score}. Enjoying the view? 👀"
            story = f"Silence in the away end! {player} puts {team} ahead in the {minute}th minute! Score: {score}.\n\nOther teams spend millions, we just produce magic. Have a great evening! 🍿"
            discussion = f"GOAL! {player} in the {minute}' ({score})! What a moment!\n\nRate that finish out of 10 in the comments below! 👇"
        elif tone == "professional":
            short = f"GOAL: {team} {score} {opponent}. {player} ({minute}')."
            story = f"GOAL! {team} take the lead through {player} in the {minute}th minute.\n\nCurrent scoreline: {team} {score} {opponent}."
            discussion = f"{team} {score} {opponent} after {player}'s goal in the {minute}th minute.\n\nHow do you assess our performance so far? Let us know your thoughts."
        else:  # hype
            short = f"⚽ GOALLLL! {player} puts {team} ahead in the {minute}'! {score}!"
            story = f"⚽ WHAT A STRIKE! {player} with an absolute rocket in the {minute}th minute! {team} {score} {opponent}!\n\nTHE EMIRATES IS BOUNCING! LET'S GO!"
            discussion = f"⚽ GOAL! {player} makes it {score} in the {minute}th minute!\n\nIs he currently the most in-form player in the squad? Drop your thoughts below! 🔥"

    elif context_type == "halftime":
        if tone == "banter":
            short = f"Half-Time: {score}. So far, so easy. Time for a coffee ☕"
            story = f"Half-Time whistle blows with {team} on top ({score}).\n\nOpponents came for points, but they're leaving with a football lesson. 45 more minutes to go!"
            discussion = f"Half-Time: {score}.\n\nAre the opponents even trying today? Drop your honest first-half ratings! 👇"
        elif tone == "professional":
            short = f"Half-Time: {team} {score} {opponent}."
            story = f"Half-Time: {team} {score} {opponent}.\n\nThe teams head into the break after an intense opening 45 minutes. Second half to follow shortly."
            discussion = f"Half-Time: {team} {score} {opponent}.\n\nWhat tactical adjustments would you like to see from the manager for the second half?"
        else:  # hype
            short = f"Half-Time: {score}! Solid 45 minutes, let's finish the job in the second half! 🔥"
            story = f"Half-Time: {team} {score} {opponent}!\n\nGreat intensity and passion from the lads in the first half! 45 minutes away from securing the victory!"
            discussion = f"Half-Time: {score}!\n\nWho was your standout player of the first half? Drop their name below! 👇"

    elif context_type == "fulltime":
        if tone == "banter":
            short = f"FULL-TIME: {score}. Normal service resumed. Sleep well, rival fans! 👋😴"
            story = f"Full-Time: {score}! That's three points safely tucked away.\n\nAlways sweet taking all the points when rivals were talking so much before kickoff. Enjoy your weekend! 🍿"
            discussion = f"Full-Time: {score} victory!\n\nWho took the biggest loss today: the referee or the rival fans in our mentions? Let's discuss 👇"
        elif tone == "professional":
            short = f"FULL-TIME: {team} {score} {opponent}."
            story = f"Full-Time: {team} {score} {opponent}.\n\nA resilient display earns all three points. Thank you to all the fans for your fantastic support."
            discussion = f"Full-Time: {team} {score} {opponent}.\n\nWho is your Man of the Match from today's encounter?"
        else:  # hype
            short = f"FULL-TIME! THREE POINTS ARE OURS! {score}! GET IN! 🔥"
            story = f"FULL-TIME: {team} {score} {opponent}!\n\nWHAT A WIN! The energy, the passion, the commitment from the boys today was unbelievable! WE MOVE!"
            discussion = f"FULL-TIME: {score} WIN! 🏆\n\nDrop your Man of the Match in the comments! Who deserves the match ball? ⚽👇"

    elif context_type in ("news", "transfer"):
        short = f"🚨 {headline[:100]}"
        story = f"📰 BREAKING: {headline}\n\n{context_data.get('summary', '')}\n\nStay tuned for further updates on this developing story."
        discussion = f"🚨 {headline}\n\nWhat is your reaction to this news? Good move for the club? Share your views below! 👇"

    elif context_type in ("substitution", "sub"):
        detail = context_data.get("detail", "")
        detail_text = f" ({detail})" if detail else ""
        if tone == "banter":
            short = f"🔄 Fresh legs! {player} enters the fray in the {minute}'! Let's shake things up! 👀"
            story = f"🔄 TACTICAL SHAKEUP in the {minute}th minute!\n\n{team} make a change: {player}{detail_text}.\n\nTime to turn up the heat! 🔥"
            discussion = f"🔄 SUB in the {minute}': {player}.\n\nGreat substitution or wrong tactical call? Let us know what you think below! 👇"
        elif tone == "professional":
            short = f"🔄 Substitution: {team} ({minute}'). {player}."
            story = f"🔄 Substitution for {team} in the {minute}th minute.\n\n{player} takes the pitch{detail_text}."
            discussion = f"🔄 Tactical switch for {team} in the {minute}th minute: {player}.\n\nHow do you rate this change?"
        else:  # hype
            short = f"🔄 SUB: {player} is on in the {minute}'! Let's go! ⚡"
            story = f"🔄 TACTICAL CHANGE! In the {minute}th minute, {player} comes onto the pitch for {team}!\n\nBig impact incoming! Let's make it count!"
            discussion = f"🔄 SUBSTITUTION: {player} introduced in the {minute}'!\n\nCan he make the difference? Drop your expectations below! 👇"

    elif context_type == "lineup":
        formation = context_data.get("formation", "4-3-3")
        starting_xi = context_data.get("starting_xi", "")
        bench = context_data.get("bench", "")
        changes = context_data.get("changes", "")
        missing = context_data.get("missing", "")

        changes_note = f"\nKey changes: {changes}" if changes else ""
        missing_note = f"\nMissing: {missing}" if missing else ""

        if tone == "banter":
            short = f"📋 LINEUP IS IN! {team} playing {formation}. Opponents, beware! 🔥"
            story = f"📋 TEAM NEWS!\n\n{team} line up in a {formation} shape:\n{starting_xi}\n\nBench: {bench}{changes_note}\n\nTime to show them how football is played! 🍿"
            discussion = f"🚨 TODAY'S STARTING XI ({formation}) is out!\n\nWho scored the biggest win making this XI, and who got done dirty? Debate in the comments! 👇"
        elif tone == "professional":
            short = f"📋 Lineup Announcement: {team} vs {opponent} ({formation})."
            story = f"📋 Team News: Here is the confirmed starting lineup for {team} ({formation}):\n\n{starting_xi}\n\nSubstitutes: {bench}{changes_note}{missing_note}"
            discussion = f"📋 Confirmed Lineup: {team} announce starting XI in a {formation} system.\n\nWhat are your thoughts on today's tactical setup and team selection?"
        else:  # hype
            short = f"📋 HERE IS OUR STARTING XI! {formation} formation! LET'S GET THE THREE POINTS! 🔥"
            story = f"🚨 YOUR MATCHDAY SQUAD IS LOCKED IN!\n\n{team} line up in a {formation} setup:\n\n{starting_xi}\n\nBench: {bench}{changes_note}\n\nLET'S DO THIS! 💪"
            discussion = f"🚨 OFFICIAL LINEUP: {team} ({formation})!\n\nWhat do you think of today's starting XI? Drop your match predictions below! ⚽👇"

    elif context_type in ("analysis", "full_analysis"):
        motm = context_data.get("man_of_the_match", "Key Player")
        rating = context_data.get("rating", "8.5/10")
        summary_text = context_data.get("summary", "")
        stats = context_data.get("key_stats", {})
        poss = stats.get("possession", "55% - 45%")
        shots = stats.get("shots", "15 - 8")
        xg = stats.get("xg", "2.1 - 0.7")

        if tone == "banter":
            short = f"📊 Post-Match Reality Check: {team} {score} {opponent}. Completely outplayed them. Stats don't lie! 🍿"
            story = f"📊 TACTICAL MASTERCLASS BREAKDOWN:\n\nFinal Score: {team} {score} {opponent}\nPossession: {poss} | xG: {xg}\n\nMan of the Match: {motm} ({rating}) 🌟\n\nOpponent fans were vocal before kickoff, but silent for 90 minutes. Sleep well! 👋"
            discussion = f"📊 FULL MATCH ANALYSIS: {team} {score} {opponent}.\n\nWho was your MVP today? Was {motm} deserving of the Man of the Match crown? Let's debate! 👇"
        elif tone == "professional":
            short = f"📊 Full-Time Analysis: {team} {score} {opponent}. Man of the Match: {motm} ({rating})."
            story = f"📊 Post-Match Tactical Review: {team} {score} {opponent}.\n\n{summary_text}\n\nKey Match Statistics:\n- Possession: {poss}\n- Total Shots: {shots}\n- Expected Goals (xG): {xg}\n\nMan of the Match: {motm} ({rating})."
            discussion = f"📊 Tactical Performance Review: {team} {score} {opponent}.\n\nHow would you rate the manager's tactical setup and game management out of 10? Share your analysis."
        else:  # hype
            short = f"📊 FULL GAME BREAKDOWN! {team} {score} {opponent}! WHAT A SENSATIONAL WIN! 🔥"
            story = f"📊 POST-MATCH TACTICAL REVIEW & RATING!\n\n{team} {score} {opponent}!\n\n{summary_text}\n\nKey Metrics:\n• Possession: {poss}\n• Shots: {shots}\n• xG: {xg}\n\n🌟 MAN OF THE MATCH: {motm} ({rating})!\n\nThree massive points in the bag! WE KEEP MARCHING ON! 💪🔥"
            discussion = f"📊 FULL MATCH RATINGS: {score} WIN!\n\nWho gets your 10/10 rating today? Did {motm} steal the show? Drop your player ratings below! ⭐👇"

    else:  # fixture / generic
        short = f"⚽ Matchday: {team} face {opponent}! Kickoff soon."
        story = f"⚽ MATCHDAY!\n\n{team} take on {opponent} in today's crucial fixture. Venue: {context_data.get('venue', 'Home')}.\n\nCome on boys, let's get the job done!"
        discussion = f"⚽ MATCHDAY: {team} vs {opponent}!\n\nDrop your exact score predictions below! Whoever gets it right gets a shoutout! 🔮👇"

    return {
        "short": f"{short}{tag_suffix}",
        "story": f"{story}{tag_suffix}",
        "discussion": f"{discussion}{tag_suffix}",
    }


async def generate_post_variations(
    context_type: str,
    context_data: dict[str, Any],
    tone: str = "hype",
    language: str = "english",
    default_hashtags: str | None = None,
    api_key: str | None = None,
) -> dict[str, str]:
    """Generate 3 social media post variations (short, story, discussion) using Gemini Flash in a single request.

    Falls back to deterministic templates if no API key is available or request fails.
    """
    active_key = api_key or settings.GEMINI_API_KEY
    if not active_key or not active_key.strip():
        logger.info("No Gemini API key provided. Using template fallback.")
        return _get_fallback_variations(context_type, context_data, tone, language, default_hashtags)

    # Tone instructions
    tone_guides = {
        "hype": "High-energy, passionate, enthusiastic, heavy on emojis, celebrating the club's pride.",
        "banter": "Cheeky, playful, sarcastic, witty, teasing rival fans, confident swagger.",
        "professional": "Official club PR style, factual, respectful, clean, objective journalism.",
    }
    tone_desc = tone_guides.get(tone.lower(), tone_guides["hype"])

    # Language instructions
    lang_guides = {
        "english": "Natural, engaging English.",
        "banglish": "Bengali words written phonetically in English alphabet (Bengali transliteration/Banglish), lively football fan group style.",
        "bengali": "Standard natural Bengali script (বাংলা), emotionally resonant for football supporters.",
    }
    lang_desc = lang_guides.get(language.lower(), lang_guides["english"])

    system_instruction = (
        "You are an expert social media manager for a football club fan page. "
        "Your task is to take the provided verified match or news facts and generate 3 distinct post variations. "
        "Strict rules:\n"
        "1. Do NOT invent unverified facts, injuries, or events.\n"
        "2. Do NOT output any hashtags (hashtags are appended automatically by the system).\n"
        f"3. Tone: {tone_desc}\n"
        f"4. Language: {lang_desc}\n"
        "5. Output must be strictly a JSON object with exactly three keys:\n"
        '   "short": A quick, punchy 1-2 sentence reaction.\n'
        '   "story": A captivating, narrative post with paragraphs and emojis.\n'
        '   "discussion": An engaging post specifically designed to get comments on Facebook, ending with an intriguing debate question.'
    )

    prompt = f"Context Type: {context_type}\nEvent/Story Facts:\n{json.dumps(context_data, indent=2, default=str)}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": system_instruction},
                    {"text": prompt},
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.7,
            "maxOutputTokens": 600,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{GEMINI_API_URL}?key={active_key}",
                json=payload,
                headers={"Content-Type": "application/json"},
            )

            if resp.status_code != 200:
                logger.warning(
                    "Gemini API returned error code %d: %s. Using fallback.",
                    resp.status_code,
                    resp.text[:200],
                )
                return _get_fallback_variations(context_type, context_data, tone, language, default_hashtags)

            data = resp.json()
            raw_text = (
                data.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [{}])[0]
                .get("text", "")
            )

            parsed = json.loads(raw_text)
            tag_suffix = _format_hashtags(default_hashtags)

            return {
                "short": f"{parsed.get('short', '').strip()}{tag_suffix}",
                "story": f"{parsed.get('story', '').strip()}{tag_suffix}",
                "discussion": f"{parsed.get('discussion', '').strip()}{tag_suffix}",
            }

    except Exception as exc:
        logger.error("Error communicating with Gemini API: %s. Using fallback.", exc)
        return _get_fallback_variations(context_type, context_data, tone, language, default_hashtags)

