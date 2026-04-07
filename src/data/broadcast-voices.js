/**
 * MFD Broadcast Voices
 *
 * Play-by-play commentator personalities (Joe Buck, Al Michaels,
 * Chris Collinsworth) with event-specific call lines.
 */

export var BROADCAST_VOICES_991={
  voices:[
    {name:"Joe Buck",calls:{
      td:"TOUCHDOWN! Right through the heart of the defense!",
      int:"INTERCEPTED! What a read by the defense — stunning!",
      sack:"He's SACKED! Never had a chance! They got him!",
      big:"Oh my — WHAT a play! The crowd is going absolutely WILD!",
      fumble:"FUMBLE! The ball is OUT! Chaos on the field!",
      fg:"IT IS GOOD! Right down the middle — no doubt about it!",
      fgMiss:"No good! Wide right! He's going to hear about that one.",
      safety:"SAFETY! Two points for the defense! Incredible turn of events!"}},
    {name:"Al Michaels",calls:{
      td:"TOUCHDOWN! You simply cannot script it any better than that!",
      int:"PICKED OFF! The defense reads it perfectly — huge momentum shift!",
      sack:"DOWN he goes! Brought down hard — that's going to hurt!",
      big:"Do you BELIEVE in miracles? Because that just happened right before our eyes!",
      fumble:"FUMBLE! The ball is loose — it's a scramble! Who's going to come up with it?",
      fg:"IT'S GOOD! Right between the uprights — pressure? What pressure?",
      fgMiss:"Wide left! He had the leg — just no accuracy tonight!",
      safety:"SAFETY! That is just extraordinary — two points the hard way!"}},
    {name:"Chris Collinsworth",calls:{
      td:"LOOK AT THAT! What a play — you just can't coach that kind of talent!",
      int:"Oh, that was a terrible decision. Just terrible. He forced it and paid the price.",
      sack:"And DOWN he goes! The pocket completely collapsed around him!",
      big:"That's just special. You can't teach that. That kid is SPECIAL.",
      fumble:"He's fumbled it! The ball is out! That's going to be a backbreaker!",
      fg:"Splits the uprights! Cool as ice under pressure — outstanding!",
      fgMiss:"He missed it badly. That's a kick you have to make at this level.",
      safety:"A safety! You almost never see that but when you do it completely changes the game!"}}
  ],
  pick:function(lg){return BROADCAST_VOICES_991.voices[((lg&&lg.totalPlays)||0)%3];},
  getCall:function(lg,type){var v=BROADCAST_VOICES_991.pick(lg);return v.calls[type]||null;}
};
