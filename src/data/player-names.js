/**
 * MFD Player Name Pools
 *
 * Multi-cultural name pools (classic, modern, southern, international)
 * with position-specific weighting for realistic name generation.
 */

export var PLAYER_NAMES_991={
  first:{
    classic:["Mike","Tom","John","Chris","Kyle","Brett","Aaron","Scott","Brian","Kevin",
             "Eric","Mark","Jeff","Ryan","Jason","Matt","Todd","Derek","Craig","Shane",
             "Brad","Chad","Lance","Greg","Blake","Trevor","Travis","Justin","Adam","Cole",
             "Cody","Austin","Hunter","Tyler","Logan","Colton","Garrett","Tanner","Parker","Dalton"],
    modern:["Jaylen","Malik","Darius","Zach","Cooper","Trevon","Lamar","DeAndre","Tyree","Kavon",
            "Keyon","Jabril","Marshon","Quincy","Tavon","Devontae","Jarvis","Rashard","Damian","Tyson",
            "Deshawn","Terrell","Kendall","Jaquan","Amon","Trayvon","Keenan","Devante","Caleb","Brayden",
            "Tyrion","Jamar","Stephon","Kareem","Jevon","Dontae","Caylin","Micah","Saquon","Jalen"],
    southern:["Tanner","Clint","Beau","Tucker","Colt","Bo","Wyatt","Cade","Trace","Rhett",
              "Colby","Ty","Cash","Lane","Heath","Brock","Gage","Ridge","Slade","Dak",
              "Bubba","Junior","Hank","Roy","Earl","Wade","Vance","Jed","Cord","Tex"],
    international:["Rodrigo","Kwame","Nikolaj","Malakai","Andres","Tonga","Rasmus","Kaito","Emeka","Oluwaseun",
                   "Matias","Ola","Bjorn","Tomaso","Yousef","Kijana","Miroslav","Fabrice","Diallo","Thibault",
                   "Ola","Eddy","Lars","Rene","Kofi","Seneca","Amadou","Reuben","Tobias","Mathis"]
  },
  last:{
    common:["Smith","Johnson","Williams","Brown","Davis","Wilson","Moore","Taylor","White","Harris",
            "Martin","Thompson","Garcia","Robinson","Clark","Lewis","Lee","Walker","Hall","Allen",
            "Young","Hernandez","King","Wright","Lopez","Hill","Scott","Green","Adams","Nelson",
            "Baker","Carter","Mitchell","Perez","Roberts","Turner","Phillips","Campbell","Parker","Evans",
            "Edwards","Collins","Stewart","Sanchez","Morris","Rogers","Reed","Cook","Morgan","Bell"],
    athletic:["Jackson","Jefferson","Washington","Armstrong","Crawford","Dawson","Lawson","Patterson","Richardson","Ferguson",
              "Cunningham","Montgomery","Henderson","Richardson","Freeman","Griffin","Bryant","Foster","Porter","Warren",
              "Barnes","Dixon","Watkins","Hicks","Gibson","Murray","Riley","Pierce","Garrett","Harrison",
              "Sanders","Simmons","Hunter","Coleman","Ross","Tucker","Freeman","Nichols","Powell","Long",
              "Patterson","Stone","Bradley","Hamilton","Owens","Hudson","Graves","Jennings","Flynn","Mathis"],
    regional:["Thibodaux","Fontenot","Broussard","Guidry","Boudreaux","Hebert","Tanner","Harrington","Buchanan","Whitfield",
              "Beaumont","Thornton","Beauchamp","Callahan","Gallagher","O'Brien","Flanagan","Beaumont","Stafford","Beauregard",
              "Carmichael","Aldridge","Beaumont","Hollingsworth","Davenport","Abernathy","Blackwood","Ashford","Dunmore","Wainwright"]
  },
  positionWeights:{
    QB:{classic:0.35,modern:0.35,southern:0.20,international:0.10},
    RB:{classic:0.20,modern:0.50,southern:0.20,international:0.10},
    WR:{classic:0.15,modern:0.55,southern:0.15,international:0.15},
    TE:{classic:0.40,modern:0.30,southern:0.20,international:0.10},
    OL:{classic:0.35,modern:0.25,southern:0.30,international:0.10},
    DL:{classic:0.25,modern:0.40,southern:0.25,international:0.10},
    LB:{classic:0.35,modern:0.35,southern:0.25,international:0.05},
    CB:{classic:0.15,modern:0.55,southern:0.15,international:0.15},
    S:{classic:0.25,modern:0.45,southern:0.20,international:0.10},
    K:{classic:0.30,modern:0.20,southern:0.10,international:0.40},
    P:{classic:0.35,modern:0.20,southern:0.15,international:0.30}
  }
};
