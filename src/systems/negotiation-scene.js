/**
 * MFD Negotiation Scene
 *
 * Contract negotiation dialogue system with personality-driven
 * agent opening statements and counter-offer responses.
 */

export var NEGOTIATION_SCENE={
  AGENT_LINES:{
    opening:{
      high_greed:[
        "My client is the best {pos} on this team — and the market knows it. We're looking at {demand}. Non-negotiable.",
        "Let me be direct: {name} has outside interest. Match {demand} or we're testing free agency.",
        "The market has spoken. {name} is worth {demand}. Don't make this awkward."
      ],
      high_loyalty:[
        "Look — {name} loves this city. He wants to stay. We're asking {demand}, and there's room to talk.",
        "{name} told me to be reasonable. He's not chasing money. Start us at {demand} and let's get this done.",
        "This is a hometown deal. {name} wants the ring, not the payday. {demand} gets it done."
      ],
      high_ego:[
        "{name} should be the highest-paid {pos} in this league. We want {demand}. That's where it starts.",
        "He's a franchise player. Franchise players get paid like franchise players. {demand}. Full stop.",
        "Do you know what {name} brings to this locker room? {demand} doesn't even cover the intangibles."
      ],
      high_ambition:[
        "{name} is on a trajectory. He wants a deal that reflects where he's GOING, not where he's been. {demand}.",
        "My client is chasing a legacy. He needs {demand} and a real shot to compete. Can you offer that?",
        "Stars need platforms. {name} wants {demand} and a winning team. Show him both."
      ],
      high_workEthic:[
        "{name} outworks everyone on that roster. His film grade earns {demand}. He's earned it.",
        "Every morning, every rep. {name} demands {demand} because he delivers {demand} worth of effort.",
        "Consistency has a price. {name} has shown up every day. {demand} reflects that."
      ],
      normal:[
        "We're looking for fair market value. {demand} over {years} years feels right.",
        "Simple deal: {name} for {demand} per year. He's proven his worth. Let's get it done.",
        "Nothing fancy here. Market value is {demand}. We're ready to sign if you are."
      ]
    },
    counter:{
      low_gap:[
        "We're close. Bump it to {ask} and we've got ourselves a deal.",
        "Almost there. {name} asked me to push one more time. {ask} closes it.",
        "One final move and he's yours. {ask}. Take it."
      ],
      mid_gap:[
        "That's a start, but we're not there. Come up to {ask}.",
        "I hear you. But {name} is worth more than that. {ask} is the next step.",
        "We came down. Now you come up. {ask} and we keep talking."
      ],
      high_gap_greed:[
        "That's an insult. We're going to test free agency if that's the best you've got.",
        "My client deserves better than that. Walk me up to {ask} or we're done here.",
        "You're not serious with that number. {ask}. That's your last chance."
      ],
      high_gap_loyalty:[
        "{name} wants to stay. But he can't justify that number to his family. {ask}.",
        "He asked me to be patient. I'm trying. But {ask} is the floor.",
        "This is hard. He loves this place. But {ask} is what we need."
      ],
      walkout:[
        "{name} needs time to think. We'll talk to other teams.",
        "We're stepping back. Other doors are open. Don't wait too long.",
        "Talks are over for now. {name} has options. Use this time wisely."
      ],
      accepted:[
        "Alright. {name} respects the organization. We'll take it. Call the press.",
        "Deal. He's excited. He said this is where he wants to be.",
        "Signed. {name} said to tell you he's going all in for a ring this year."
      ]
    }
  },
  getOpeningLine:function(player,demand,years){
    var pers=player.personality||{};
    var greed=pers.greed||0;var loyalty=pers.loyalty||0;
    var ego=pers.ego||(pers.pressure||0);
    var ambition=pers.ambition||0;var workEthic=pers.workEthic||0;
    var pool;
    if(greed>=7)pool=NEGOTIATION_SCENE.AGENT_LINES.opening.high_greed;
    else if(loyalty>=7)pool=NEGOTIATION_SCENE.AGENT_LINES.opening.high_loyalty;
    else if(ego>=7||pers.pressure>=7)pool=NEGOTIATION_SCENE.AGENT_LINES.opening.high_ego;
    else if(ambition>=7)pool=NEGOTIATION_SCENE.AGENT_LINES.opening.high_ambition;
    else if(workEthic>=7)pool=NEGOTIATION_SCENE.AGENT_LINES.opening.high_workEthic;
    else pool=NEGOTIATION_SCENE.AGENT_LINES.opening.normal;
    var idx=Math.abs((player.id||"").charCodeAt(0)||0)%pool.length;
    return pool[idx]
      .replace("{name}",player.name||"He")
      .replace("{pos}",player.pos||"player")
      .replace("{demand}","$"+demand+"M/yr")
      .replace("{years}",years||"3");
  },
  getCounterLine:function(player,ask,offerGap){
    var pers=player.personality||{};var greed=pers.greed||0;var loyalty=pers.loyalty||0;
    var pool;
    if(offerGap<2)pool=NEGOTIATION_SCENE.AGENT_LINES.counter.accepted;
    else if(offerGap<4)pool=NEGOTIATION_SCENE.AGENT_LINES.counter.low_gap;
    else if(offerGap<8)pool=NEGOTIATION_SCENE.AGENT_LINES.counter[(loyalty>=6?"high_gap_loyalty":"mid_gap")];
    else if(greed>=7)pool=NEGOTIATION_SCENE.AGENT_LINES.counter.high_gap_greed;
    else if(loyalty>=6)pool=NEGOTIATION_SCENE.AGENT_LINES.counter.high_gap_loyalty;
    else pool=NEGOTIATION_SCENE.AGENT_LINES.counter.walkout;
    var idx=Math.abs((player.id||"").charCodeAt(1)||0)%pool.length;
    return pool[idx]
      .replace("{name}",player.name||"He")
      .replace("{ask}","$"+ask+"M");
  }
};
