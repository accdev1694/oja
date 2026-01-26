0:01
Yo, what is going on papa fam? Welcome back to the channel. It's your boy Sunny and today we are building something
0:08
pretty damn cool. An AI dating app. And I said an app, which means iOS and Android. We're building on Expo today.
0:15
There are so many cool things. And if you've ever wondered you wanted to build an app, now is the best time. I can
0:21
promise you not. This is the best time to build an app. We have Expo SDK55,
0:26
tons of cool stuff, liquid glass, all of that beautiful stuff in the mix today. And you guys are just going to see some
0:32
serious power behind how you can build moving forward with the new AI techniques, as well as the best
0:37
practices that you should take on while you do that. When that beat drops, make sure you go ahead and get ready for the
0:42
demo. Let me know where you're watching from right now. If you haven't already, all I ask you do is you drop a comment,
0:48
subscribe to the channel, hit the like button so I know you want more content just like this. But as always guys,
0:53
we're going to dive into the AI dating app demo right now. Check it out. Boom.
1:00
Here we go, guys. Here we have it on Expose SDK55,
1:05
which means it works on across all platforms, by the way. It's going to work on iOS, on Android, everything
1:10
across. Right. So, I'm going to run you through a demo of the app because there's quite a few things to cover in
1:15
this app. It's a big app, which means I've given you the code. Yes, you can be sure of that. So firstly, these are demo
1:21
pictures. Don't worry, I did not need to get permissions and so forth. This is just demo pictures of someone right now.
1:26
Uh but we've got the whole flow. We've got the dislike flow. We've got the ability to like people and so forth. We
1:32
even have AI matches. Now I'm talking about like how we how we have it here. I'm wondering can I maybe I've got a
1:37
good idea actually. Let's go ahead and do this. This is quite nice. I'm going to go ahead and hide that for a sec.
1:43
There we go. That's kind of a nice little way to demo this out. Cool. So you guys can see for yourself. We've got
1:48
today's picks and here we can see look 42 42%. Oh, everyone's 42. Oh, okay. I
1:54
guess it my seating was not very uh we'd only done three matches on each one. Okay, that's fine. So, in this case,
1:59
we've got today picks, today's pick. They refresh every day. And basically, they're going to go ahead and match you
2:05
up based on your attributes and someone else's attributes. And it finds three AI picks of the day. So, in this case, you
2:11
can see that I match up on travel, cooking, music. And in case you're wondering why it says Elon, uh the dummy profile I've made today is Elon Musk, 25
2:18
years old. This is the demo picture in uh Expo, so don't worry. But we've got so much cool flows to go through. You
2:24
look at the bottom. Look at that. We've got liquid glass. So proper native feedback, full live chat and everything.
2:31
So we can jump into a chat. You guys can go ahead and see. You can say hello. And you get the full chat flow with
2:36
optimistic UI updates and so forth. We even get little notifications, you know, in case somebody's going to go ahead and
2:42
message us. So really, really awesome stuff over on that front as well. But I take it a step further every single time. So not only do we have these
2:48
matches, so say for example, I was to go ahead and accept this one. Whoa, we have a nice little popup. So there we go. You
2:53
and Scarlet liked each other. Send a message. And I can go ahead and say, "Yo."
2:59
Okay. And then go ahead and do so like the normal dating flow, right? So in this case, going back over to our app,
3:05
you can see over here, we can go ahead and like as well. And uh yeah, so I'm going to show you how you can even seed
3:11
different things. What I mean by seed is how we can populate the database to have loads of testing scenarios. So in this
3:16
case I can keep on swiping and then you can see that it looks works so nicely. We can go down and you can see we've got
3:22
all of their profile details. Now if we go into my profile I can of course manage and edit my profile. So if we
3:28
jump into it we can see we can go ahead and add different pictures. So let's go ahead and add another picture. So I'm going to go ahead and allow full access.
3:34
And this is what I mean about the demo pictures on iOS simulators. So you can see I've just got like literally waterfalls. So, we're going to pretend
3:40
that that's a person. Uh, we've got the name, the bio. We can go ahead and update. And then we've got the date of
3:46
birth and, uh, all of those things over here. So, you can go ahead and change your age. You can say I am a man or a woman. And then you can go and select
3:51
who you're interested in. So, you can go and say everyone, woman, and so forth. And then we have different interests.
3:56
So, in this case, I've limited it to six, but the whole point of this demo is that you can go ahead and customize it as much as you want, right? So, in this
4:03
case, if I was to get rid of cooking and do gaming, for example. Same with location, right? So, this has a full
4:09
expo location package installed. So, if we were to go ahead and update, it would pull from my phone's location.
4:15
Obviously, this is a simulator, so it believes I'm in uh San Fran. And then we've got the distance that you're willing to travel for your dating. Okay.
4:22
So, in this case, look at that. Also, glass UI. So, I'm going to show you how to do all of this, right? And you can even select unlimited if you want to go
4:27
ahead and date across all the continents. And then when we hit save changes, something really cool happens.
4:32
It's going to generate new vector embeddings for your profile. So what's actually happening behind the scenes is
4:39
demo gods are against me right now. Maybe I haven't Oh, I actually can't. No, I didn't. CL. Yeah, it's all good. Yeah. So in this case, like you can see
4:45
gaming. So now what it's done is it's recreated my embeddings for my profile.
4:50
And then with the AI matches, we actually have a whole algorithm where it will go ahead and compare if you're
4:56
actually similar to someone else and also to the degree of what similarity you are. Right? So there's so much cool
5:02
stuff happening behind the scenes there. I took it a step further. That's not all. If we go ahead and sign out, nice
5:07
alert prompt. Just go ahead and sign out right now. We're going to jump over to the home screen. We've gone ahead and called it um Heartley. So far, oh, why
5:15
is that? Hold for review. Wow, I need a profile on his No, you do not. So, in this case, we have Heartley here. So,
5:21
find your perfect match. Look at the little animations in the background. Right. So, I'm going to teach you how to do all of this. We're using Clerk
5:27
authentication here. So, Clerk is powering everything on this side. If we go ahead and type in our email address,
5:32
we can log in. But if I want to go ahead and click on sign up, I'll show you the whole sign up flow. So firstly, I'm
5:38
going to go ahead and do sunny sanga. And let's just do a demi a dummy
5:43
account plus5@gmail.com. And I'm just going to go ahead and put in a password right now. So let's just go ahead and pop in something.
5:51
And look, I even got this little strong indicator. Okay, let's go ahead and create the account. And now what we
5:57
should see is look, verify your email. So what I'm going to go ahead and do is just check my email right now. Uh, and
6:02
Jay can actually go ahead and do that while I read some of the chat. So, in this case, we can go and see. We got Australia in the house, India, Kenya,
6:09
UK. What is up, guys? Good to see everyone here. We got Ranger Foundry. What's good, guys? I love your energy.
6:15
Everyone's super active today. And it's it's early in the morning. I appreciate that activity, right? So, really, really
6:20
awesome stuff. Once we get this uh verification code, I think all my apps
6:26
are on uh my phones are on silent right now. Uh Jay, did it come through? can
6:31
just just double check. We've got so many like AI tools. There we go. Jay gave it. All right. So, I'm going to go
6:37
ahead and pop in the O code. So, we have full two factor authentication in this flow. So, let's go ahead and do a Oh, I
6:44
need to just type in 916. Uh 87. Boom. Let's go verify email. And
6:51
then just like that. Woo. We have a nice signup flow. So, this is a full on
6:56
boarding flow, right? So, it's pretty cool, right? Oh, I love that. MC ISO goes, "Big fan, mate. You taught me how
7:02
to code." Hey, that is what I'm talking about. Oh, we even got Japan in the house. That is so cool. Uh, we got
7:07
Tatiana. What's up? Hey, biggest fan. Let's go and do Sunny. Let's do my name.
7:14
And then you can see when's your birthday, right? So, in this case, let's just pop a random birthday. Going to cut some age off of me right now. Go next.
7:21
Uh, I'm a man. I'm interested in women. Uh, age range. Let's go ahead and select
7:27
an age. So, let's go ahead and just do uh d just just pop random ages in. Go continue and then enable location. So,
7:34
in this case uh I'm in Dubai, but obviously on the simulator it's going to go ahead and pick San Francisco, right?
7:39
So, we can go ahead and sect a distance range. So, 50 miles. Go ahead and click on continue right in your bar. So, we
7:45
can say I love to code and all things AI, right? Obviously, that would suck as
7:51
a dating profile, but we move. So, in this case, let's go ahead and continue. And then you can see your interests. Uh
7:57
so let's just type in I don't know, let's just select a couple of these. Uh boom, boom, boom. And we're happy with
8:03
that. Then we're going to complete the profile and add a photo. Okay, we need at least one photo to go ahead and get started. So let's go ahead and add in
8:10
this one right here. Boom. And then we're going to go ahead and continue. And then once that's done, look,
8:16
generating AI magic. You're all set. And then bam, it'll throw me into the flow. Just like that, we are inside the app.
8:22
So now if I go to profile, you see I have a full profile. I'm able to edit all my details. We can go over to the
8:27
edit screen. I can do the whole edit flow that I showed you earlier. And you can see I have my AI embeddings, which means it's able to find me a match. And
8:33
as you can see, like 53%, 50%, it found different matches. We've got the whole AI, you know, the typical dating app
8:39
flow. We click on each side of the screen and it will go ahead and show and it shows also who I'm matching against. And the discover is just so clean. So if
8:46
we were go ahead and say like like some people, don't like some people and so forth. You go for but yeah, that's the
8:52
entire app. It's absolutely crazy. We have so much to do in today's app. It's going to be a huge one. So, your boy is
8:58
helping you out a ton and giving you the code for absolutely free because I understand that this can be a pretty
9:04
heavy task today, right? So, first things first, let's break down the tech that makes this all possible. So, behind
9:10
the scenes, we have Expo. Now, if you don't know what Expo is, you need to know if you're trying to build an app. Expo essentially allows us to think of
9:17
it like a layer the the the the primary layer on top of React Native and it allows us to easily manage all of our
9:23
dependencies, our deployments, everything like that. So they have a couple of awesome services like EAS and
9:29
so forth. But something that really caught my attention was actually the beginning of SDK 40 uh 54 and then 55
9:36
came out yesterday and now these guys are cooking. They're doing some crazy stuff right now. So you can see in 54
9:43
they had firstly the pre-ompiled React Native for iOS um upgrade which means
9:48
that it now sounds like a kind of a technical thing but really it just means your builds are getting built so much
9:54
faster and anyone that's ever done React Native or iOS work or Android work you'll know that the build time takes a
10:00
bit long right so now you can see like it takes went from 120 seconds to 10 seconds like that's a huge increase and
10:07
then my personal favorite liquid glass like liquid Glass on iOS is, you know,
10:12
some people like it, some people don't, but either way, if you're going to build for it, it'll be cool if we can use tech that supports it. And as you can see
10:18
here, we have liquid glass in the building, right? So, it's going to go ahead and I'm going to teach you how you can do all of that, right? So, it's
10:25
absolutely awesome. We've got Swift UI, a bunch of other stuff. Then, they came out with some like there's so much to go
10:30
ahead and talk about with that, right? They even went on and done haptics. So, this app actually has haptics. So, when
10:36
you tap on things on the screen, it will actually vibrate your phone. So, it's pretty cool. Then we have SDK 55, which
10:42
literally dropped what, 3 days ago. So, 3 days ago, this went went ahead and dropped. And I'll show you how if you're
10:48
on an old version, you can upgrade with a very cool skill that they've just released. Uh the MCP server is super
10:54
powerful, and you guys can go ahead and check it out yourself. But one thing that I love is that when I started preparing this build, I actually started
11:01
on SDK 54 for Expo. Then I went ahead and used their brand new skills, right?
11:06
And the skills are actually from here. So you can see the agent skills expo skills repository. So if you were to go
11:12
ahead and click into that skills are a really important concept with in the AI space right now. So there essentially
11:18
allow our agent to be able to have understanding at a deeper level but it doesn't bloat the context window. So
11:24
what it does is only when you need it will pull in the skill, use that and then it can basically release that from
11:30
the context window. So it doesn't need to effectively bloat the whole thing out every single time. So expose skills, the
11:36
one that absolutely blew my mind was this one right here. So upgrading expo skills. So I set this up inside of
11:42
cursor and I just said to cursor, I was like, I'm on SDK 54. Go and upgrade me
11:47
to SDK 55. And it did everything for me. Uh, which was pretty incredible. And it did a lot of changes. It fixed things in
11:54
my codebase. It was pretty damn awesome. And I'm going to teach you how you can do the same thing. They've also added a
11:59
bunch of new stuff as well on this side. So it's damn cool. And I'm going to teach you how to do all of it today. Right now, powering the entire database
12:06
side, we have Convex. They don't really need an introduction. Convex is pretty awesome in the space. Doing all of the
12:12
authentication is powered by our amazing friends over at Clerk. So, you know, I
12:17
always say like if you if you haven't heard of Clerk, I just don't know what rock you're living under because these guys are just the king of of
12:23
authentication. If you're still trying to code your authentication, in my opinion, focus on the more important things and spend your time building some
12:30
pretty cool apps, right? Instead of worrying about authentication and stuff, just let the pros handle it. Clerk is
12:35
absolutely awesome. They go ahead and support everything from Matt Mobactor, fraud and abuse prevention, session
12:42
management, social signins. You can do everything you can imagine, including pass keys, passwords, and they stop
12:47
bots. So, if you're worried about your app getting spammed by bots, they can go ahead and make sure that none of that is happening. They have multi-tenency, B2B
12:53
billing as well as well as B2C billing. It's damn powerful. Okay, so we're going
12:58
to go ahead and also show how you can use the brand new MCP server with this.
13:03
I'll explain all of these techy terms very soon. Don't worry if in case it's like overwhelming and all that stuff.
13:09
I'll explain everything out. Um, somebody says, "Please, I have one question. Can I add my own custom back end to you?" Yeah. Yeah, of course you
13:15
can. You can you can replace the backend that we do today with whatever you want. I'm giving you the codebase for that. All I ask in return is that you have got
13:22
the whole tutorial for free, the whole codebase for free, which you can find in the link down below. You just simply go
13:28
to the link down below, click on this form, enter your name and email, and we'll send you and give you access to
13:33
the entire codebase for absolutely free. All I ask is that when you're signing up to clerk and when you're signing up to
13:40
expo, you use our links in the description. It allows us allows the sponsors of the videos to basically go
13:46
ahead and allow me to keep on doing this for free. So I can go ahead and keep on giving you all of this content and
13:52
learnings for absolutely free. And you saw some of the chat earlier. Some people have learned to code from this channel, got jobs from this channel,
13:57
built their own apps from this channel. I met someone at 1 billion summit the other day who made a million dollars in
14:04
48 hours after launching their app. So if you want that kind of potential, then this is the kind of build for you. Okay.
14:12
So without without further delay, let's dive straight into the uh demo. I'm
14:17
going to give a nice little breakdown before we jump in. Okay. So, let's talk about today's tech stack. Okay. Uh
14:24
I do use your link and get extra free on tanning. Yeah, you absolutely do. Every time you use our links, by the way, we
14:29
always always push the companies to give you as much free stuff as we possibly can. So, go ahead and do that and I'll
14:35
keep on working getting you free stuff. Okay. So, over on the techstack front, my mouse isn't working today, which is
14:40
kind of annoying. So, I'm going to have to wing it with my trackpad drawing skills, but we can see how we go here.
14:45
So in this case, let me just type in. Okay, we're good. Yeah. So a couple of things I want to cover today. Firstly, I
14:52
want to kind of highlight something. Yes, we're moving into the AI space, which means we're going to be doing an
14:57
element of AI coding today, right? So I'm going to showcase it in a balanced approach because if I was to vibe code
15:03
on this channel, which I don't know yet. Do you guys want that? Let me know in the chat right now. Let me know in the comments down below. But if you Oh, Ben
15:10
Lampley from the UK. What's up, dude? Good to see you here. Uh if you guys want AI coding on the channel, I can swing more that way. Or I like to go
15:17
forward now with giving you the code and then discussing on a higher level how we implement the architecture which is what
15:23
every developer who's left standing is going to be responsible for. The ones
15:28
who are doing the low-level stuff and not very good at it. You're going to get cut. You need to level up and start
15:34
talking about architecture, understanding how you can apply, you know, leverage it massively. So in this case, AI coding is a big topic today and
15:41
part of that is MTPs, right? We're going to talk about MTPs and we're also going to talk about skills. So skills, the
15:47
whole space is pretty much uh going massively fast. And I I love this comment here by Sarah Swati. He goes,
15:53
"No, please don't vibe code. Please no." The thing is, I'm not vibe coding, right? What I'm doing is I'm showing you
15:58
what you should be doing from now on. It's a balanced approach between coding yourself and using AI to make you a
16:06
faster, more effective developer. So, we're going to go ahead and cover that today. Okay? So, I'm don't worry, don't worry. I'm not going to just literally
16:12
make the AI do the the whole thing. It's all good. Okay? So, in this case, we have that. We have Expo. Of course, I'm
16:18
talking about SDK 55. I'm going to scream about it because they're pretty damn awesome and that's how this app was built. Uh, we have Clerk for the
16:25
authentication and we have Convex for the back end. Now, Comx is super powerful. or go check it out yourself.
16:30
Right. And then for all of the embeddings and all of that good stuff, we are using OpenAI under the hood. So
16:37
we got we got two different models. We're using 40 mini. So it's very very cheap to go ahead and actually um
16:44
so we can go ahead and uh I'm just reading a message. We can go ahead and use 4 mini to do the matching algorithm. And then you can go ahead and use even
16:50
cheaper model if you want to do the embeddings. Uh I can't remember the exact name. I I'll show you inside the build. Okay. So we're going to use this
16:57
for the vector embeddings. And one thing I wanted to mention as well is that Convex actually lets you do vector
17:04
embeddings, right? So you can actually store these vector embeddings from OpenAI inside of Convex, which is pretty
17:11
cool. So inside of Convex, we have all of our vector embeddings for each user. Each of our users profiles are being
17:16
pulled from Clerk. So they're basically all being tied together. And then of course the app is building out right
17:22
now. Like I said, if you're new to React Native, you've never coded an app before, then it's going to help you out
17:27
a lot right now because Expo runs on something called React Native. And React Native, if you're not aware, allows us
17:33
to code one codebase that compiles down into iOS and into Android. Okay, so in
17:38
that case, you can basically just code one codebase and it compiles down to iOS and Android, which means yes, even with
17:44
stuff like this, right, we have fallback mechanisms. So if we are going to go
17:49
ahead and you know uh if if the device doesn't support uh liquid glass for example which you know many people might
17:55
not be on iOS 26 then it's going to allow you to go ahead and fall back to a different style and I'm going to show you how to handle all of that right uh
18:03
in the expo SDK as well some things that which we're going to implement is liquid glass. So we're going to do liquid glass
18:09
we're also going to do um haptics. So, haptics, that's a really, really awesome thing. And something that I didn't
18:15
actually build, but you can build on top of this is in that release, they actually support live activities and
18:21
widgets. That's pretty sick. So, in case, imagine you had your dating app and then you go ahead and, you know, I
18:26
don't know, you're in the middle of a chat. Imagine you had a live activity, which just shows the chat for the next 5 minutes, you know, in case it's pretty
18:31
active, uh, and you're doing pretty decent. Then, in that case, you can go ahead and have a live activity. You can have a little widget on the front if you
18:37
want to make, you know, see how many people are matching with you and so forth. You can do all of that with Expo.
18:43
So, in case you're wondering, can is it that powerful? It's pretty damn powerful, right? I would not be using Retanator by myself by itself anymore.
18:50
I'm always using Expo, in case you're wondering. Okay, so with that said, we
18:55
are ready to go ahead and jump into the build. And of course, under all of this, we are going to be using things like
19:01
TypeScript, right? So, just proper coding practices. Now, when I'm coding, I use cursor, which is essentially uh
19:09
a big layer on top of VS Code, but cursor is pretty damn huge. Um, when if you in case you're wondering and you
19:15
know later on you're you're wondering what model was he using. I do use Opus 4.5 when I code. Uh, I have the ultra
19:21
plan. Uh, but we're not going to be vibe coding the whole thing. I'm just going to show you my approach and then how you
19:27
can go ahead and move forward with it. Okay? So, without further ado, let's just dive into some coding. So, first things first, I want you to go and fill
19:33
that form out. Go fill that form out. Enter your name, your email, get the codebase, and then once you're on the codebase, go to the code, click this,
19:41
open up your terminal. So, open up a terminal. And what I want you to do is
19:46
literally go into anywhere. You know, I'm going to go into my home directory and just do git clone and paste it,
19:52
right? And then you'll have it open. And then you can have it on the side. That's my biggest advice to you. Right? Well,
19:59
as I'm coding now, I'm going to be talking about a lot of things and there's going to be snippets of code. I'll pull in. This is how you get access
20:04
to all of that code before we start. Okay. So, that's the first step. But in before we do that, I'm I like to get,
20:10
you know, don't dump all my stuff in one place. I like to effectively store it nice and neatly. So, what I'm going to
20:16
do is I'm just going to prepare my workspace a little bit. And what I'm going to do is show you how we get started from the ground up. So, firstly,
20:23
we're going to go over to expo.com. So, in this case, if you actually go to the link in the description, hit the expo
20:28
link right now. And what you'll do is you'll get you go to the signup page. So, in the description, hit that Expo link. You'll go to a signup page, sign
20:35
up, and you'll reach a page like this. Okay. Once you've done that, then what I want you to do is go ahead and type in
20:42
Expo documentation or Expo getting started, whatever you want to do really. Uh, you just go ahead and do that. Click
20:48
on create your first app, right? And now you can see here we got this nice little Kickstarter guide. So, terminal MPX
20:54
create expo app. Right? So, let's go ahead and do that right now. So, in this case, I'm going to do MPX create expo
21:00
app. And you know, if you're using pmpp like me, then what you might like to do sometimes is go ahead and do pnpm dlx
21:08
instead of mpx. And that basically means that it's going to use my pmppm local
21:14
registry of dependency so it doesn't blow out my computer every time. Obviously, I'm not going to build sticker smash. Let's call it our AI
21:21
dating app YouTube. Okay. Hit enter. And now it'll start going and setting things
21:27
up. Now, as you can see, we can also build from templates, which is pretty cool. So, you can go ahead and feel free to check out templates. So, if you go to
21:35
like these links over here, you can actually set things up with like, for example, they've got really cool templates. I've I've done used loads of
21:40
them in the past. Like, you know, use Tailwind inside your build. We're not actually using Tailwind today. We're using just the regular CSS styling. Uh I
21:49
like to keep it balanced, right? I am a huge fan of Tailwind for NextJS, by the way. Uh but I want to show you how you
21:55
can do both on on uh expo right so let's
22:00
see okay so someone goes is mail goes I'm doing software engineering I just learn react can't figure out what I should do
22:06
next literally learn nextjs next uh and what's going to help me in the future nextjs and the right balance of coding
22:14
and AI coding right that's the two things which will get you ahead right now understanding highle architecture
22:19
how do we structure things how do we build scalable apps production level apps and that sort stuff, right? Um,
22:25
Barack goes, "Any thoughts on spectrum development?" Yes, I'll show you spec driven approach today, right? So, I'll
22:30
show you a couple of approaches with this. Yo, Mario, I love this. He goes, "We got OG's in the house, guys." Mario
22:36
is a diamond member of the Papa Fam. OG for ages, right? Good morning, Papa Fam. Sunny never seen rest. It's difficult to
22:42
keep up with this guy. Amazing things as always. I appreciate you so much, dude. What an absolute legend. Uh, this is so
22:47
cool. We got some amazing stuff. He goes, "What's up, fam?" This Moses goes, "This is so cool. I've been a student since 2021. I remember you, Moses.
22:54
Always watch and follow along. God bless you immensely. I appreciate you guys so much. Chat is popping off. All I ask you
23:00
do is you smash that like button right now, guys. I have a whole community launching very, very soon. Uh I've been
23:05
talking about it for a while because I've been trying to get it perfect with the right setup. And now me and Jay are
23:10
on fire and we have so much coming your way. So you guys can expect so much on this channel as well as in the
23:17
community. We're absolutely going to revive everything to another level. It's different. Okay. So, once we're inside
23:23
of our directory, we're going to type in cursor dot and then this will pop up our cursor instance.
23:29
And then I want you to take your time when you're in this bit, right? Don't don't kind of, you know, freak out because now every day cursor is
23:35
upgrading or, you know, whatever you're using. It can be a bit overwhelming sometimes, right? Especially now, oh, hang on, we're in side of another, you
23:43
know, not next year's template, but now we're in an expo template. It's fine. Just just take your time, understand how it works with me, and we'll proceed
23:49
slowly. Okay? So, first things first, we have the layout.tsx and then we have
23:54
this tabs approach, right? So, these are all navigators in Expo. So, I'm going to show you step by step how we can set
24:00
things up and then we can go forward and pretty much start running and building out the app. Okay, so step one, I want
24:06
you to set up, you've already set up your Expo account. I want you to go to the link in the description and click on
24:11
the clerk link right now. Go and click on the clerk link uh clerk link and you should reach this page. All right, so
24:18
I'm going to go ahead and create an account right now. I already have an account obviously. Um, but we work with these guys so much because they're just
24:23
they're they're absolute like I have not worked with a better company than CL. They are incredible guys. They really
24:29
know what devs want and they just build build build build to support the dev community. Uh, and we use them in
24:35
production in a ton of different places. They're absolute OGs in what they do. Right. So, in this case, we have
24:41
everything up and running. At the top, you will have the next page on your screen. You'll have this page if it's
24:46
your first app. Otherwise, do what I did. Uh, thank you, Maris. I appreciate you so much. Right. Then we're going to
24:52
go ahead and create an app. So, let's do AI dating app uh YouTube. Right. I just like to name it simple. You can call it
24:58
actually what you're going to call it. Email, Google, and so forth. I'm going to just stick with email today. Click on create application.
25:04
And then once that's done, we will reach this page. Okay. Now, there is something
25:10
very very cool that clerk have done recently. Okay. Before we proceed, I want to I want you to do something. I
25:16
want you to go to click on the top link over here or actually just type in clerk
25:21
mcp. Okay. Now once you see this you can see like 6 days ago use clerk's mcp
25:28
server right so it's in beta so just be aware of that but it's absolutely so easy to get set up. So depending on what
25:34
you're doing right whether it's called code cursor vs code windfur whatever it is you got the setup instructions here.
25:40
So in this case I'm going to click on add to cursor. I've already done it, by the way, so I don't need to do this again, but I'm just showing you the
25:46
steps. Then what you'll find is you'll reach this page. So if you go to I'm
25:51
just going to show you here cuz it opened up on my other browser. So we're going to click on cursor settings, it will take you to the MCP and it would
25:58
have installed Clerk, right? So if we go here and we click on Clerk, you can see right here I have Clerk set up here.
26:05
Okay, ignore my sanity one for now. In this case, Clerk is the one that we need to add, right? So now clerk have
26:11
basically released this and what this does is it gives our AI agent a bunch of
26:16
different stuff. So look clerk SDK snippet list clerk SDK snippets and a ton of different guides and tools,
26:23
right? So in this case we got two tools and a bunch of different guides which is pretty awesome and this helps you out a
26:28
ton, right? So it's going to help you out a ton when you're coding. Uh and also for anyone who doesn't know about Claudebot, if you want me to make a
26:35
video on it, I'll make one. But it's absolutely nuts. So yeah, we're expect a video on Clubbot very soon on this
26:41
channel, but it's a crazy tool uh that I've been using a lot lately and me and Jay have literally created another being
26:50
I would say in AI which is pretty cool. Um so yeah, once we have that set up, the next step is we're going to go back
26:56
over and we're going to close that and we're going to go back to our quick start guide. Click on expo and we simply
27:01
run through the steps. Okay, now we could do this manually by the way, right? which I'm going to do today just to kind of showcase how we can set
27:08
things up. But you could actually just give this they do give you prompts like quick start ones like you see here copy
27:15
prompt they for expo they did have one here before uh or you can just ask it to set up cursor and it will go ahead and
27:21
run with that but it's okay we can do that ourselves right so first step is we're going to install the clerk
27:26
dependency so open up your terminal with command j and we're going to do pmppm add clerk expo now while that's
27:31
happening we go down set up our clerk API keys so command b pull that open and
27:37
then over here I'm going to create a new file local enem.local. Then we're going to paste in the
27:42
publishable key. Okay. And notice how it's expo public. Like when we're using Nex.js, it's next public. When we're
27:48
using expo, it's expo public. Right. So we have expo public. Then we have to add the clerk provider into our root. Right
27:55
now I'm just going to check one thing because I'm just want to make sure that I have set mine up in the correct way
28:00
that I want you to set yours up. Okay. So, what we're going to do here is
28:06
typically in the top layout is where we would put, you know, our provider,
28:11
right? So, we'd wrap this with the cluck provider. What I'm going to do is create a slightly different pattern here. So,
28:16
I'm going to create a folder called providers. Providers, I appreciate you so much, Mario. Absolute legend. Have an
28:23
awesome day, dude. So, in this case, we're going to have a index providers, and we're going to create one called index.ts. And this is going to be like
28:29
the parent provider, I'd say. So let's go ahead and do sgtsx. Okay. Now the way it looks is like so.
28:37
So uh we're going to have uh react native functional
28:43
component. So something like this. And then we're going to say app providers. If you're wondering how I got that
28:49
snippet, it's the ES7 snippets inside of extensions. You simply just type in ES
28:54
and then you'll see ES7 react redux native snippets and all that stuff. just
29:00
install that and you can do what I just did and then we're going to go ahead and start populating this. So in this case we have the children which is react
29:07
nodes and then we have clerk provider. Clerk provider comes from uh we actually
29:12
need to create that. So the clerk provider I'm going to create another uh
29:18
base for this. So we're going to say clerk provider.tsx. Now in here what I want to do is I'm
29:23
going to have the following. So I'm going to create something called a token cache. But in this case I'm just exporting clerk expo. I'm getting my
29:29
key. And typically this pattern that I just did here, you kind of don't want to do that, right? So, if that is the case,
29:35
what you want to do is throw an error if the if the key is missing, right? Um, which I did here. Yeah, I did that
29:42
there. I don't know why I still had it at the top. And then we've got our uh props. And then we basically have if
29:47
clerk is loaded, then we render the children. Now, we have to pass in two things, a publishable key and a token
29:52
cache. And by the way, they they explain all of this down below, right? So firstly, I need to uh install the Expo
29:59
secure token. So command J. Pull that in like so. And as I'm doing this, I'm going to be going ahead and really
30:05
running through what I think you should be mastering. So a lot of people are like, you know, you just just get an LM
30:10
to do it. Now, if you just get an LLM to do things and you don't understand what it's doing, you will run into a brick
30:16
wall and you will not be able to progress. I promise you that you'll be impressed by surface level apps. And
30:22
that's what I can see happening all over the place. People are getting impressed with surface level AI apps. If you know
30:28
what you're doing and then you know how to use an AI agent, then you're like Tony Stark. You can do some crazy stuff.
30:34
But if you just assume that you can get super far without uh having any
30:39
understanding of what's going on, then you're going to hit some seriously like annoying points, right? So, you want to
30:44
kind of avoid that hurdle. And that's why I'm here to try and teach you. So, in this case, we got the lib folder. I'm going to create a uh orth inside of
30:52
that. So, lib orth.ts. Now, inside of here, I've just got a few
30:57
little token helpers. Now, you can see they've actually just done the token setup like so. They just go ahead and do
31:04
a token cache like this. Um, now you can do it a couple of ways to be fair. Uh,
31:09
you can either do this way, which is super simple, right? That's not that's not even a bad way of doing it. Uh, I've
31:15
done it a bit more of an in-depth way on my side. Um, which way do I show you guys? Right, I'll show you this way
31:20
first. So, I've done it quite in depth. So, in this case, we're getting a token, saving a token, clearing a token based
31:26
on if it's on the web or not. Right? Um, and then we basically will handle it. But yes, you could do either way that I
31:32
showed you. Okay. So, in this case, we have the publishable key and the token cache. That's all good. Then we go back
31:39
to our index.ts and let's go ahead and continue the wrap. So, in this case, we wrap pull it in from our local cluck
31:44
provider. Actually, no, not a local provider. This one we're going to call it the app providers. So, this one is the app providers. There we go. And uh
31:54
this is Oh, what am I doing? That's not I've named them all weird. One second.
32:00
So, inside of my providers,
32:09
obviously not. We do. Yeah, this is clerk providers in here. Sorry. Clerk provider from our local.
32:15
There we go. Yep. And then we render the children. And then now that will render this. Okay. So
32:22
now we have clerk loading here. And then what I want you to do is go into your layout.tsx. And all of this is going to
32:29
get replaced with the following. We're going to have the root layout be very very simple. We're going to have the app
32:35
providers. App providers. And we're going to wrap this with the root layout navigator. So in this case
32:42
that I'm going to create an inline component above. So you can you can do this a couple ways. I'm going to show you a mix. You can sometimes do it
32:48
above. You can sometimes do it below. Uh but the point of this one is because I want to do something called Expose
32:55
protected routes. Okay. So, this is what we just popped in here above. Right. So, Expo protected routes are very very
33:02
cool. So, if you go to Expo protected routes and really learn this pattern, I promise you it'll come in handy if
33:08
you're using um you know uh LLM direct them here basically. So as long as you're on SDK 53 or later, protected
33:15
routes are absolutely awesome. Right? So in this case, this is how we direct people to individual parts of the app.
33:21
Right? So what we're saying here is we have a login state which we're going to connect to our clerk state, our clerk's
33:26
orth. And then we say, okay, we've got certain guards which allow access to certain screens. Right? So in this case,
33:32
we have two. So in this case, we say is signed in equals use. This is how we get the user signed in state. Right? So
33:38
pretty simple. And then what we do is firstly let's uh import the app
33:43
providers from our providers file. So let's go ahead and pull that in right now.
33:52
Is this wrong? Um Oh yeah. Oops. My bad. And then this needs children. Uh oh, it
33:58
actually needs the root layout now. I'm sorry. We don't need this. There we are.
34:04
Right. And then we have the stack. Okay. So stacks are basically when we're using Expo, stacks are literally a way of
34:11
saying, "Okay, I want to wrap some pages inside of this stack." And a stack, if you think about an app, when you tap
34:17
through the different screens and sometimes you go back and it kind of slides off. You think about it, they're just stacking pages on top of each
34:24
other. So if you click on the settings screen, sometimes it'll go stack on that page and then you can go back and it
34:29
stacks off that page. We have, for example, stack navigators. You have tab navigators at the bottom where you can
34:35
click on the different tabs and it will basically go through and to the different screens. So in this case we're saying we have a stack where we're
34:41
hiding our header because we want to custom style it. And then we have our first protected screen which is the all screens. When the user is not signed in
34:48
they will only see these screens. When the user is signed in they will see these screens. Now you can see we've got
34:53
grouped uh routes here right? So we need to create these grouped routes. So in order to do that now what we do is where
34:59
we have tabs before. We're actually not going to use that for now. We're just going to create a new group throughout called one called app and another one
35:06
called orth. Okay. And this is how we keep things pretty neat. So the first
35:11
one that we are, you know, worried about is orth. So in orth we're going to create a layout.tsx. So underscore
35:18
layout tsx. It's very very similar in fact to nex.js.
35:24
Right. So we have this or layout and we've got the colors using the app theme. We've got our stack. Now, in
35:30
here, we've we've customized a few things. We've got the content style. We've got the header shown first. We want to hide the header. And we got the
35:36
animation sliding from the right every time we stack on top of it. We've got three screens here. Sign up, sign in, sign in, sign up, and on boarding. And
35:43
then we've got this lib theme, right? So, I'm going to go ahead and create that lib theme right now. And this is going to be theming for our app. So,
35:49
inside of lib theme.ts. And what you can see here is we're going to have to install this. But we have our basically
35:55
themes for the app. Okay. So you can go ahead and get access to this from the codebase but effectively we've got you
36:01
know nice little color scheme set up here right so I need to go ahead and install this right here so pmppm I and
36:09
this install expo material themes right so we are going to be using expose
36:14
material 3 theming and if you go over there you can actually see if you type in material uh three I believe it is
36:23
actually I think it's actually liquid glass that gets installed by default So here you can see
36:30
we'll get into it when we get there. Right? But yeah, you can go ahead and liquid glass is going to be part of the setup afterwards. Right. So we've
36:37
installed that. We're good. Let's go back to our or go back to our layout. So our layout for author is now there. So
36:43
we need to create the pages. Right? We've got obviously sign in, sign up, uh and then on boarding. So in this case,
36:50
sign in. Let's go ahead and create that screen first. And actually, you know what? Let's start the app because obviously that would be helpful, right?
36:56
So, I want to actually start up on a different I guess a different simulator. Well, for now, you've seen the demo of
37:02
the app. Okay, so we can go ahead and actually screenshot a couple of these. I'm just going to create a couple of screenshots for these so we can kind of
37:09
reference these afterwards. Uh oh, I'm signed in as a new user, so that's fine. We've got the user screen afterwards.
37:15
We've got this screen as well as the edit screen. And then, yeah, that's kind of a nice
37:21
way of I guess doing that. Uh, and then we've got the sign. If we sign up, we can go ahead and see the login screens.
37:26
So, we've got this screen and we've got the sign up screen. Cool. So, with that
37:31
in mind, I'm just going to go ahead and pull up those on the computer now so we can actually see them. And I always, you
37:38
know, it always saves it into a very weird place. I don't know where I put it. Uh, but these are going to be
37:44
essentially our designs. And so I'm going to take an approach here where let's imagine we had a designer maybe
37:50
you know or AI maybe generated a couple of designs. Now we can go ahead and see okay we've got a couple of designs from
37:55
our designer we need to build this app now right so this could be a genuine rocase scenario where you know someone's
38:01
come up to you and say hey I've got an idea for an app and it kind of needs to look like this and you need to build it out right so we're going to build the
38:08
first we're going to spin up the app that allows me that's the whole point of that is cuz I needed to cut the app. So we're going to do pmppm start. Now, a
38:15
couple of things. Now, if you don't have a Mac, it's going to be more difficult to test iOS simulators because you need
38:22
to have Xcode, right? So, you need to go to the app store and download Xcode. And then once you've done that, start Expo
38:28
Xcode up and it'll start installing a couple of dependencies. That's going to be an important first step. Then, the
38:33
next step is after you've done that, you can go ahead and load up Xcode uh like so. So head over to your Xcode, go into
38:40
your settings, and then what I want you to do is go down to components, and you can start to install the different
38:46
platform support options, right? So in this case, you can see we've got iOS 26 simulator, which is what I've done, iOS
38:52
17, and so forth. And you can add platforms here, and you can basically go ahead and install different simulators. So you're going to need to install the
38:58
iOS 26 simulator at the time of this recording, right? Or anything above that in order to keep up with me today. Now,
39:05
if you can't do that, you can go ahead and download the Android Studio and get the Android simulator up and running and
39:12
it will just run on the Android instead, right? Obviously, you won't get the liquid glass, but that's fine. We're going to build for both today. Then, if
39:18
you if you want to still do it on iOS, then that's fine. You can actually go ahead and grab your phone and once we
39:24
spin things up, you can go ahead and scan a QR code. Uh, and I'm going to show you how we can go from Expo Go to
39:30
something called the Expo development build afterwards. Okay. So in this case, we've got it running on a different
39:35
port. So I'm going to cut the other app right now. And then we actually want it running on local 881.
39:41
So PMPM start to get things spinning up. And now you can see you should get this a nice QR code. You can scan that on
39:47
your local network provided that your phone is on the local network and it will actually launch the app on your phone. Right? So instead I want to go
39:54
ahead and do see we're using Expo Go right now. Right? I'm going to launch in iOS. So I'm going to press I and you see
40:00
it says installing and then it opens it up and it says install open up in Expo. So let's go ahead and throw this phone
40:06
over here now. And now you can see in a moment it will go in a pop-up. So I want you to get
40:12
very familiar with this whole flow right now. Okay. So in this case it will start
40:17
building and you can see in the terminal you have everything happening right. So in this case look hey we've got awesome
40:23
tabs and you got everything working. Now if I press R it will refresh right and
40:28
then if I ever need to you know I forget my commands do question mark inside the terminal and now you can see I've got
40:33
the iOS simulator I can if I press shift I I can select which iOS simulator so I
40:39
can make sure you know maybe if I want to test in an old simulator or a new one uh I can go and do that and also I can
40:45
switch to an Android simulator or device as well right so in this case by pressing A. So this is how you get back
40:50
to the screen in case you're wondering. Okay, so with that in mind, now let's start building things out a bit. So step
40:55
one is we're going to go ahead and make sure that this doesn't render out the wrong stuff. So firstly, I'm going to get rid of the tabs, right? So get rid
41:03
of these tabs and then we should uh again sometimes even when you click on the phone, press R to refresh. Okay,
41:10
let's get rid of that annoying screen. And you see right now we have nothing popping up, right? That's fine because we don't actually have a default page at
41:17
the moment, right? So, it's going here. It's finding that Hang on a minute. We haven't got the right user or we haven't
41:22
set things up for it first, Jess. We still didn't finish the uh clerk setup. So, I kind of jumped over the place. So,
41:28
let's go back to clerk and then let's carry on doing that. So, we've got the clerk thing set up. Yep, we've got that
41:33
set up. And then we've got the sign in and sign up pages. Yes. So, here you can see app orth sign up and sign in. Right.
41:40
So, I'm going to just go ahead and copy the sign in for now. So into our orth
41:47
and you see where we have this. We're going to create a new sign in sign-in.tsx
41:54
like so. Who's coding along with me? Let me know in the comments. Right. I'm going to go ahead and press uh pop it in. So that I got that from um them
42:03
inside the documentation. And you can see look we have the the start of everything. Right now one thing is when
42:08
you're developing on an iPhone or an Android via Expo or Clerk, you have this dangerous area. Okay. And that is called
42:14
the safe zone, right? So it's out of the safe zone right now. So we need to obviously fix that, right? We don't want
42:19
to have it in that in that way, right? So I'm going to go ahead and show you how you can, you know, fix those kind of
42:25
issues and make sure that we're we're not facing that, right? So the first step is if you want to fix it, go down
42:31
to the view and you can simply use something called the safe area view, right? From that instative safe area
42:39
context. Now, once you do that, safe area view, you can see it pops into the
42:44
safe area. Now, this is good, but the problem with that is, you know, when you're starting to get into the
42:51
nittygritty, nice fancy editing, like you see, I've got colors up here that I want to go ahead and style, it can be a
42:57
bit of a pain, right? So, we're going to make it so I'm going to show you how you can still color in that space.
43:03
Otherwise, you'll start cutting off things and it'll start being a bit of an annoying situation. Right? Now again
43:09
like I mentioned today's build you have access to all of the code. So I want to focus more on the high level what is
43:15
happening and show you how to piece together your app. I'm going to show you how to debug it and move forward like that. And then we're going to basically
43:22
move forward on rather than going line by line by line on the coding. Right? So the main thing is this is all of the
43:29
logic required to handle a signup. Okay. So in this case if I was to go to the signup page you see unmatched route. So
43:35
firstly let's create that signup page. So, we're going to do sign up.tsx.
43:41
Okay. Then we can go back to the documentation and we can go to the add a
43:46
signup page. Copy that. Go back over. Go ahead and paste it. Now, you can see
43:52
over here, if we hit save and we hit R to refresh, page not found. That's because we go
43:58
back. I think I probably routed to a wrong page to be fair. Um,
44:04
so in that case, what we can do is let's pull up an old terminal. And you can see route sign is extraneous. We've got too
44:11
many screens to find. And then we have sign up is missing the default export as well. So sign up is Oh, did I? Yeah, I
44:19
did put in there. There we have sign up. And let's go ahead and do AR to refresh.
44:25
And sometimes what you can do here is we can close that out and hit an I to go
44:30
ahead and pull it open again to get the fresh state again. Okay. And then let's see. Okay. So which
44:37
one are we going on right now? So why is why is it not finding a uh page? Let's see. Uh SJ goes, "Five years ago, I've
44:44
started learning react from you. Landed a startup job and now I've landed in a good M andC. I'm not sure what MNC is. I've learning a lots of tech from your
44:50
videos and building projects. Thank you. I appreciate you so much. Thank you." What is M andC? Um but in this case
44:55
let's fix this first. So uh we are I want to show you in the layout firstly
45:02
let's debug something. I want to do console log is signed in right. So how do we get the console logs from this
45:08
right? That's the kind of interesting part. So if you do question mark in the terminal here you can see we should have
45:14
a open debugger option J. So if I press J it launches dev tools. Now, what you
45:19
can see is if I hit a refresh, when we hit that um multinational comp.
45:24
Okay, nice. Now, when we hit that refresh, it goes page cannot be found. Okay, so it's weirdly not even getting
45:30
us to the point that I need. I've screwed one thing up and it's very annoying. Here we have it. Unstable
45:35
anchor. There we have it. Root layout nav. So,
45:42
the anchor is the wrong one. Get rid of that. and also
45:54
my root layout. Checking something. Let's go ahead and render this out here.
46:00
Console log root layout.
46:07
Interesting. We're in a very weird situation. Let's find out what's going on. Uh I want to just try something. I
46:14
think it's because I don't have a space page. So,
46:20
we have this our layout.tsx sign in sign up on boarding. And I believe I have
46:28
I think it might be the app that's just freaking out here is signed in.
46:35
Okay. So, if we go into our app then ah okay because we don't have an
46:41
index.tss. it doesn't actually know where to start. That's the problem, right? So, that's why it's kind of
46:46
freaking out right now. So, what we're going to do is we're going to set it up a little bit in advance. So, we're going to create inside of our app folder.
46:53
Remember that tab folder that I deleted? Probably don't delete it next time and just keep it over here. So, we have tabs. And then what I want you to do is
47:00
inside of there, we're going to have a layout. We got quite a lot inside that layout. But for now, I'm just going to
47:05
have an index.tsx. So, an index.tsx react native functional export
47:11
component. I'm just going to call this the start page, right? Let's keep it
47:17
very simple. Hit R. And then that also needs a layout. TSX
47:22
React Native functional. And there you go. We're actually know even without the layout, we're good. So
47:29
there you go. So we just needed that initially to go ahead and get started. Right. So now if we hit R now, now it
47:36
searches and it finds it. The problem is is that it's not registering our user. So, I've screwed something up which we
47:42
need to go ahead and figure out. So, step one is why can't I see my logs?
47:48
That's interesting. So, if we were to go here and type in console log, uh hello
47:53
from the start page. So, this isn't the correct This hasn't connected here correctly.
47:59
So, okay. No, we can see it here. So, we can't see it in here. So, let's go ahead and close that for now. Sometimes it
48:05
doesn't connect very well. Uh which is annoying, but anyway. So
48:11
I'm going to we need to lock in a bit. Right. So we got hello here and it's false. So we are not signed in which is
48:17
false. So if we go over to layout right now and then I can do some debugging here. So we can do uh is signed in. And
48:25
now we can see over here is signed in false. Yeah. So you can see here the guard. So in this case we can do console
48:32
log and let's just do is signed um what's it called? Where to go. And then I'll say
48:39
is if it's not is signed in then we go to orth otherwise app. So command J where
48:47
to go orth. So in that case it's going to direct us to the orth and then it should be going here finding orth
48:55
layout.tsx renders the stack. Okay. This is how you debug at that level. Now with
49:01
the stack why is it going to that page is interesting. So I need to find out why that's happening. Um,
49:12
and it is rendering this route out. Okay. So, because we're not logged in, we
49:18
shouldn't be seeing this right now. So,
49:24
we're not signed in. Yeah, that's correct. So, we have the layout here. We have our stack. Let me double check what my layout is doing. Stack, you're
49:32
amazing. Thank you so much. I appreciate you. Right. So, we got the stack here. Sign in. Sign up. On boarding we don't
49:38
have yet. I do have an on boarding though and I think that could be why. So let's go ahead and just comment this out
49:44
for now. The tabs layout.
49:51
My question here is why is it trying to go to that first? So I've screwed something up that I need to find out. So
49:57
app or so let's just rewind for a second. We've got app or layout. App or
50:03
layout. So firstly let's get rid of our model. We don't need this for now. Refresh.
50:09
100% correct. I appreciate you guys. Right. So, you know what? Let's uh I'm
50:15
going to show you what I would do in there. I'm going to, you know, I'm actually going to try and be as realistic as possible in what I do cuz I
50:21
think it's going to be more useful than trying to show you like debugging it and da da. So, what I would do here is
50:28
literally tell you I would go to command and I would showcase now cuz before I would debug this and everything blah
50:33
blah blah and it would take a bit of time. Now, I wouldn't do that. I would literally go here and I would say uh
50:38
this basically I'll grab that, copy and paste that in here and I'll say we and then what I actually use is I use
50:44
something called super whisper. So you can go free feel free to check it out yourself. Superw whisper.com. Use code
50:49
sunny. The owner is actually pretty awesome. He actually reached out and he said you guys get something for him for free if you go ahead and do that. So you
50:55
can download it. Use code sunny inside of the um checkout and you can basically
51:01
go ahead and get that. So it's pretty damn awesome, right? Um I do it all the time, right? So I use this app all the
51:06
time. So now I can talk to it. So I can basically go ahead and say uh so let me go ahead and just mute the
51:13
audio for a sec. So where's the audio here? Okay. So I can go and say D
51:20
option P. And yes, I know you have a debug mode as well, but I don't like the debug mode. So in this case, you see
51:26
command. If I press shift tab, I can tab through. And then here I can just simply say we are using Expose stack protected
51:33
screens. And right now it's not rendering the O page, it's rendering the app page instead. Help me figure out
51:38
where the issue is. And then we simply go ahead and let it transcribe. And this is pretty accurate that I found. So in
51:44
this case, I can just go ahead and trigger that agent off. And you know, if you're using several agents, you can
51:49
pretty much command I to pull this screen up or if you press command E, it will take you to this view and then
51:55
everything flips. So I like to have it. So I have my agent view and then whenever I want to go ahead and code as
52:00
well, I can go ahead and do this. So yes, I can do sign in as index, but there is a way uh to not do that. And
52:08
I'm just curious as to why exactly uh this is happening. Um I don't want it to
52:13
do a redirect and I'm pretty sure I don't do a redirect in my app. So there's a reason why it's it's happening
52:21
and uh and I kind of want to make sure that we get that happening corrected first. So app layout is missing and I
52:29
believe so let me check if the tab needs layout. So it created that for me. So in this case it created a stack for the
52:36
screens and then in this case it went ahead and did the same for tabs over
52:41
here and then it's showing us true cash previous sign in session clear the out
52:48
there temporary sign out button clear token. So on the index.tsx tsx page of the tabs. It's gone ahead and just put
52:54
in a sign out button in case we were already Oh, maybe actually that was why
52:59
because we were actually signed in already on the other device perhaps. No. Um
53:05
in this case missing app layout without this layout expo couldn't read. Okay. So what we did wrong there is yes firstly
53:13
Roberts is 100% right. What happened there? Let me turn music on. So what happened there is we didn't have so what
53:20
it does it basically scans your app for the layouts right and then it tries to find the first index file when you've
53:25
got some kind of you know like in this case in the top level layout where we have some protected situations it's
53:31
going to try and firstly scan for an index to find out where where do I start right uh and then without the correct
53:37
layout file sometimes it can screw things up because it doesn't know so it just jumps to the index file so in this case and what else did it give an
53:43
explanation for so looking at your photo the app folder is missing a layout. Expo requires each
53:49
route group to have a layout file to properly render its children. You see, so in this case, that helped me figure
53:54
out the issue. So this is the this is the feedback loop that I want you to implement when you're coding, right? And start getting used to using it like
54:00
that, right? And you can see it gives me a possible other reasons and so forth, but that was able to essentially
54:06
basically teach me that okay, if you have these groups, each one needs to have its own layout to correctly go
54:13
ahead and render children. Okay. So, in this case, let's go ahead and move forward. So, our signup page is correct now. Okay. Now, once that's done, we're
54:22
actually going to just create the sign-in page. So, for this, let me pull in my signin page. And I'm going to make
54:29
the music a bit more chill cuz it's kind of a bit headbangy right now. Give me
54:34
one second. I'm going to make it. Last time we found a very nice lowfi playlist
54:40
on Epidemic Sounds, and I'm going to go and make it start using that. So,
54:46
uh, search music, loi,
54:53
loi house. Loi introvert radio. Let's do this one.
54:58
This is cool, right? At least you guys can focus a bit more. I get a lot of feedback on like sometimes the music can
55:03
throw you guys off. So, hopefully that helps. AQ says, "Hey, here from Malawi." Oh, love you. I appreciate you, dude.
55:10
Welcome. Okay, so the sign-in page, right? We're going to go ahead and refactor all of this. So firstly, we
55:17
have, you know, a simple sign in here, right? So in this case, it's just doing a simple sign in. Uh, and same with the
55:24
sign up. If you go to that page, it'll prepare email address verification, send the OTP. So all of the logic, by the
55:30
way, for that is already done. It's already here, right? So I'm not going to
55:35
go over this cuz it literally is done for us, right? Um, what we want to do is change the entire UI, right? So, when we
55:43
need this verification step, we're going to have a new whole component here called code verification. And then
55:49
otherwise, we're going to render out our beautiful UI, which is this one right here. Okay. So, the goal is we want to
55:56
make it look, so let's keep that to the side. We want our app to look a bit like this. Okay. So, I've given you the code.
56:02
So, we're going to kind of fast forward a little bit. So we have firstly um the
56:08
view itself, the surrounding view and then I've got some floating hearts I've gone ahead and built out and so forth.
56:13
Uh so we can go ahead and do that. So firstly the floating heart. Okay. So
56:22
now when I'm coding this I am definitely using an element of AI to help me out. Just a full transparency in case you're
56:28
wondering does he do everything manually anymore? No I don't absolutely not. I use AI a lot. Um, but I'm always
56:35
literally checking through everything that it does. Okay. So, first thing is we have our floating heart component
56:42
right at the top. Now, you should be actually shifting these out. Uh, so like if you see me doing patterns like this
56:47
and you like if you can go and simply put this into another component outside, it's absolutely fine uh to do that.
56:53
Right. Then we want to have in the animated. Now, we need in order to have this, we need React Native Reanimated.
57:00
So, I'm going to go ahead and install that. So, I'm going to split this terminal and I'm going to go ahead and keep that
57:05
on the side. And I'm going to do pmppmi react native reanimated
57:10
to install that. Now, we're going to have a bunch of things that we need to import.
57:17
So, I'm going to go ahead and pull these in right now. So, we've got a few of these, right? We're not going to
57:23
actually need all of these. Well, we don't need that. Um, but we're going to need them in a moment. Right. So, we got
57:28
the floating heart, size, top, left, delay, opacity, right? And all I asked
57:33
for it was I want these little floating hearts and I want it to look kind of cool. That's it, right? Super simple.
57:39
Super super simple. For the symbols, we are using a library called Expo symbols,
57:44
right? So, that's all automatically installed for us. So, that gives us those little floating hearts in the background, right? Really simple. Now
57:51
inside of the actual signin page part of it uh I'm going to basically go and
57:58
firstly I'm going to put in the chunk which is the entire block for the signin page. Again you can get this whole thing
58:05
over here. Go to go to the description down below get the code form and go
58:11
ahead and grab this and get clone it. Okay so I'm going to pull in this and then we're going to run through each bit. So here we have the whole block.
58:19
Right. Right. So let's go. Let's do a bit of a deep dive now. So linear gradient. What is that? Right. How do we get a linear gradient? Right. So the
58:26
linear gradient is from
58:33
we need to import it from expo linear gradient
58:39
and we need to install this pmppmi expolinear gradient.
58:48
Okay. Now heading back down, we've got a gradient being applied stylesheet. The
58:53
stylesheet, the pattern that we're going to be following is at the bottom of every single page, I'm going to just append my stylesheets. Now, you can
59:00
definitely go and put this into a separate file if you want to keep things neat, right? But in this case, at the bottom here, you can see I've just got a
59:06
stylesheet, and this is where I'm going ahead and effectively just uh putting in
59:11
the different styles for each thing. And you can go ahead and get these styles in the code. But effectively, if you look
59:16
at this, it's just doing regular CSS styles. Nothing fancy is happening here.
59:21
Uh, usually sometimes we use Tailwind to do this. Um, but in this case for Expo React Native, you can also do it this
59:28
way. And with AI, it's actually very easy to do it this way, right? I never used to like it this way because it was kind of a long process, but with um AI,
59:35
it makes it super easy to be honest. Right. Stylesheet.create is freaking out why exactly. Let's see. Am I importing
59:43
it? We don't seem to import it. So, let's pull that in from React Native
59:48
like so. And then let's go back down and let's start render things up. So, we got a scroll view. The scroll view we are
59:55
going to pull in from uh I'm going to actually just make sure I import all of the correct things.
1:00:02
There we go. Not this. Okay. And then back down. Then we've got
1:00:09
a few things which I need to go ahead and pop in afterwards. So this is the actual flow of things. Now all we're
1:00:14
doing here is we have a text input. So this text input is going to resemble this email address, this password, and
1:00:20
then the sign in. I didn't actually build in the forget password flow. Um I know of unless the AI did, but I didn't
1:00:27
build that. Um but Clerk actually supports that super easily by the way. So it's super easy to go ahead and do
1:00:32
that. Uh but first things first, once we have these fields like you know the input, the password and so forth, then
1:00:39
of course we're going to need some state, right? So I'm going to just simply pull in some state that we can
1:00:44
use. Now most of this is very very simple state. So let's go ahead and go up here. I'm just going to replace this
1:00:49
with that. Now you got safe area inserts. Now remember I talked about that safe area. Well, if you don't want
1:00:55
to use that component which will automatically block out the tops like I mentioned sometimes you want to style
1:01:00
behind it and so forth then we can get the difference. It can calculate the difference at the top and then we can
1:01:06
just use that where we need to. So you can see look padding at the top padding at the bottom based on those insets. So
1:01:12
those are very very handy things to know about right and then we've got the use state from React. So simply going to use
1:01:18
state. Um and then down here we've simply got some state that we're going
1:01:24
to go ahead and use when we're uh you know do handling our 2FA and so forth.
1:01:29
Okay. So on sign in I' I've created mine are a little bit different. I've created just slightly different but the I'll
1:01:35
show you mainly the logic of signing in is the exact same but all I do
1:01:40
differently is I have things like haptic button press. Oops. Haptic button press which I'll show you after. In this case,
1:01:46
all we're doing is we're signing in. When we are finished, we set the active state to be the session that came back.
1:01:53
And then if we do need 2FA, it will go ahead and handle that because the demo that they gave doesn't always have that
1:02:00
included, right? So in this case, you might need that. And then if if we do have a 2FA requirement when you're
1:02:07
trying to sign in, then we're going to have that right here. So in this case,
1:02:12
we have a little bit of defensive block. We shouldn't do anything if it's loading. But attempt second factor email
1:02:18
code and then once that's done it we'll go ahead and say active. Okay.
1:02:24
Now if we do need 2FA so second factor then what we do is
1:02:29
we're going to render this code verification block. Okay. So the code verification block what is that right? Well that is that block that popped up
1:02:36
which then made me uh enter in the code the six-digit code that clerk sent us. So in order to do that, what I'm going
1:02:42
to do is I'm going to create a component. Right? So in our components folder, going to go over here. I'm going
1:02:48
to create a folder called O. Inside of there, I'm going to have an index.tsx.
1:02:53
Right? Now, what we're doing in this build is we're having something called barrel exports. Right? Some people like
1:02:59
it, some people don't. I don't really show it a lot, but what I'm going to show you this time is barrel exports.
1:03:04
Oh, someone just got timed out for 86,000 seconds. Jeez. And also, we just
1:03:09
broke 100 likes. So, thank you so much, guys. Keep destroying that like button. Get me to a thousand. Let's go. All right. So, bar exports help us when we
1:03:16
have lots of different components in a folder. It makes the importing a lot easier. Then, we're going to have something called code verification.tsx.
1:03:23
Right. So, what I've done is with some of these components, I've gone ahead and really, you know, commenting things out so you know exactly what's going on.
1:03:30
Basically, it takes a couple of props. This is just our TypeScript definitions. Email title, subtitle, on verify, on
1:03:35
back, button, and icon. Right? We have some state and then we basically handle
1:03:40
the verification. Right? So in this case when we go to that screen we have a safe area view and then we've got a glass
1:03:47
back button. Right now we don't have these glass components I spoke about the liquid glass ones. We're going to create
1:03:52
those and then we're also going to create some shared UI components because what what I'm trying to teach you guys
1:03:58
is we instead of having the same repeated code everywhere, we're just going to make these repeated um the
1:04:04
single components we can reuse elsewhere. We got the keyboard aware view. This one is very very important.
1:04:10
Typically when you're typing in, so say for example, if this field was lower. So say it was down here. And let's say I
1:04:16
start typing into the email field. When my keyboard comes on the screen, it might block the email address. So
1:04:22
imagine the email address was here and the keyboard was popping up on the screen up to this high. I can't see the
1:04:27
the input field. So what you do is you wrap it in something called a keyboard aare view. And there's a way that we can
1:04:32
do this nicely with the styles. You can see we simply have a flex and then there are some padding things we can do with
1:04:38
it as well. Right, the view essentially is a div and then animated view allows us to have in these fade elements where
1:04:45
it can nicely gently fade in. Okay, the glass input is effectively what we're
1:04:50
going to show you in a moment. I need to build that out and same with glass button. This effectively this is just a
1:04:56
wrapper component I'm going to build with you that allows us to if the device supports liquid glass, it'll render the
1:05:02
glass button. If it doesn't support liquid glass, then it will render the normal React Native styled button that
1:05:08
we decide. Okay, so we're going to go ahead and do that kind of approach. So components class and we also need the
1:05:14
components UI. It's up to you. We can go either either way. Let's go ahead and firstly do a keyboard aware view. That's
1:05:20
going to help us out. So for the keyboard aare view inside of UI, we're going to pop that in here. Keyboard aware view. And what we've done here is
1:05:27
I've created a reusable wrapper component that handles the keyboard avoidance. Okay. So if you look at the
1:05:34
documentation, so the link is here to look at it. Uh basically there's two different ways of handling that popup
1:05:40
when the keyboard comes onto the screen. What for iOS we use padding and for Android typically the keyboard of uh
1:05:47
avoiding view just simply does it itself, right? But we need to include the padding when we use um the iOS uh
1:05:54
side for iOS devices. So all we do here is we have the actual keyboard avoiding view from react native and we have the
1:06:00
styles being passed through which is flex one but the behavior is the important part. If the platform OS this
1:06:06
is a little trick that we can use from the ra native library not a trick but it's just a tool we can use if it's iOS
1:06:12
then we we include the padding approach otherwise we simply have undefined because Android handles that with the
1:06:17
keyboard avoiding view and then this vertical on uh keyboard offset is if we want to increase the offset that it
1:06:24
basically gets pushed up we have the ability to do that so now I just wrap everything in that one component as
1:06:29
opposed to writing this every single time. Okay, so that handles the keyboard aware view. Next up, header icon. Header
1:06:37
icon I use in a bunch of places as well. So once again, we're going to go ahead and create another component. Header
1:06:42
icon.tsx takes an icon, icon color, background color, and size prop. And
1:06:47
here it's a reusable header icon for onboarding and the author screens. Okay.
1:06:54
And this keeps the consistency quite nice. Okay. So we have a view ionic icons. It's just a header basically.
1:07:00
It's very very simple. Okay. So, let's go back to our code verification and make sure that that's
1:07:07
all good. And this is freaking out because we don't seem to have those
1:07:12
saved. So, components UI. Let's see. Unable to resolve path. We do
1:07:19
have that. Or you can do command P restart TypeScript server. And also, by the way, if you do command P with the
1:07:26
the kind of crocodile mouth, do select TypeScript version. Always use the workspace version. and it will help you out a ton. It always give you something
1:07:33
extra with your linting. Okay, this one's interesting. Why can we not find that? So, components UI. It's there. Um,
1:07:41
keyboard aware view and header icon. Oh, maybe I don't have a index. Yep, here we
1:07:48
are. So, you see how I don't want to have to always write forward/ keyboard
1:07:53
avoid this and so forth, right? I just want to sometimes pull from the overall top library. In order to do that, we add
1:08:00
a barrow export. So, index.ts. And then we can have something like this
1:08:06
where eventually we will have all of these inside. So, in this case, for now, I can simply just comment these out.
1:08:14
But this will now mean I can now export things like so. You see? So, it's a nice
1:08:21
little trick with it. It's called a barrel export, right? The same thing for components, right? So, the glass
1:08:26
components. So, we're going to go ahead and do a forward slashglass folder. And
1:08:32
then we've got quite a few different buttons here. I basically made a glass component for every single variant of
1:08:38
what we might be using. Right? So, in this case, uh, we'll have an index.ts file. So, index.ts file. And you can see
1:08:45
we've got a glass back button, a glass button, a glass card, a glass chip, a glass close button, header icon, input,
1:08:50
nav, option text. Basically, I've created wrappers for everything, right? So I'll show you one for example. Let's
1:08:57
do a glass button. Okay. So a glass button for example. Diving into this. Well firstly we need to install a couple
1:09:03
of things. Expo blur. Expo glass effect haptics. We need to set up as well. So if you're wondering where the hell do I
1:09:10
begin with this right? Type in expo and just type in liquid glass documentation.
1:09:16
Now firstly when you are talking to um your LLM if you're coding with it you
1:09:24
know what I would recommend is you do command I you install those expo skills that I talked about previously right
1:09:29
I'll show you how to do that in a moment and then what you can do is you can do forward slash and you can see that building native UI you see this this is
1:09:37
awesome this actually shows it how it can do things like liquid UI and so
1:09:43
forth right so you see blur effects with expo blur liquid glass with expo glass effect and so forth. So, how did I
1:09:50
install that skill? Well, in cursor, what I did is I go to settings. I go to cursor settings. I go over here and I go
1:09:57
to rules, skills, and sub aents. If you don't see this, update your cursor. Now, this is improving so fast all the time,
1:10:03
by the way. Now, skills, we press plus new. Uh, that's to create one. Sorry. If we want to import one, then what we can
1:10:10
do is
1:10:17
Uh they used to have a they used to actually say you can import it. Um
1:10:25
well in this case, okay, help me create a skill for cursor. Uh if we were to find that cursor skill. So I'm just
1:10:31
going to type in expo um cursor skills.
1:10:37
Let's just type in expo skills collection of AI agent skills. Right. So, what I'm going to do is I'm going to copy this GitHub repo link. And you can
1:10:45
see that this is if you're using Claude Code, they give you an example of how to install the skills. But if you're
1:10:50
installing inside of cursor, then you can do it like so. So, let's find it.
1:10:57
So, it says expo skills. Uh, check out the upgrade skills. This
1:11:03
was awesome. I used this and it was pretty damn good. Um, expo skills repo.
1:11:08
Let's go over here. Okay, so we're back here. So, I'll show you anyway. So, what you can do is you can just pop it in. We'll say import
1:11:17
these skills. Okay, create skills and just hit enter. And this should go ahead and pull those skills in for us. So,
1:11:24
let's see what it does. The user wants me to create a skill that helps import export skills. So, it should just be able to pull them in. So, open cursor
1:11:30
settings, navigate to rules and skills. Uh, we already have them. So
1:11:38
I think it's it's getting confused cuz we already did it. So I hope you create a skill. Uh what should I do? Installing
1:11:43
skills from the G managing. No. So this is just going to do it like that. But the actual it it did it correctly in the
1:11:51
thought process. So you can see here uh open cursor, navigate to rules, add rules, remote rule, GitHub. That's
1:11:58
actually the one that I was looking for. So oh where is that one? So, oh sorry,
1:12:04
it's it's here. Yeah, my bad. So, if you want to add that in, what you need to do is you see where it says rules, go to
1:12:10
new, add from GitHub, and then it will give me a repo. Then, what I want you to do is go to the code, grab the repo from
1:12:17
the expo skills. So, here, add from GitHub, pull that in, and hit enter. And what that will do is
1:12:24
it will go ahead and it will pull it in a rule. So, complete guide. So it actually it would
1:12:32
have I think I've just doubled it down here. Well, I think export don't. Okay. I mean
1:12:39
I've either doubled my stuff now. Complete guide for I don't think I think it's smart enough to know that it's not.
1:12:45
And then what it does it also adds the skills. Right. So now what it would have done is automatically added the skills
1:12:50
as well for you. And then what you want to do is inside of your chat whenever you're coding or whatnot what you can do
1:12:56
is let's start a new chat. do type in forward slash and you can see the skills itself. So now when you let's say if I
1:13:02
want to say fix my code here with a glass button I just do this and now it can actually automatically pop that in.
1:13:08
But say I really just want to say make sure you use that. That's how I go ahead and do it. And now it won't bloat my
1:13:14
context for no reason. It will just use it when I need to use it. Okay. So we
1:13:19
can even click into it and all it is by the way is an MD file with a name and description. Complete guide for building beautiful apps with expo for example.
1:13:25
Right. It's basically like uh similar to how we have the claude MD, we have agent MD and so forth. But this only gets
1:13:31
pulled in when we need it. So it doesn't blow by default. And you can see that always try expo
1:13:37
before creating custom builds and so forth. And it basically runs through and teaches our LLM about the how to do what
1:13:44
we needed to do. Okay. So in this case, let's just go ahead and install things. Expo blur. I'm going to show you
1:13:50
manually, but of course you could actually use it and it would install everything for you. Um, but let's go
1:13:57
back to the documentation because I'm trying to get a nice balance of, you know, oh, actually, we can just do this.
1:14:02
XP MPX expo install glass effect. Let's do that. MPX expo install expo glass effect.
1:14:09
Right. And going back here, glass view only supported on iOS 26 and above.
1:14:14
It'll fall back to regular view on unsupported platforms. Okay.
1:14:20
Usage. See, for example, it gives us a glass view, a glass container, and then you see this is a liquid glass available
1:14:26
function. This is the one where we're going to use a lot of the time to basically determine if we can render out
1:14:32
that UI or not, right? Um,
1:14:37
I'm just checking. Yeah, cool. So, nice stuff. And then in this case, you got a few of the options down there, right?
1:14:43
So, that's done. And then we've got, you see, it just installed a bunch of things that we needed. Okay. So, I'm not going
1:14:48
to go through the button itself. The main thing that I want to highlight is we'll do the haptics in a moment but if
1:14:54
you see here primary variant the main thing that I want to show you is here is liquid glass
1:15:01
available right if it is available then we render out the glass view component otherwise we render out uh if there if
1:15:08
we're on iOS we render out the blur view component otherwise we render out a normal view and then this way you can
1:15:15
basically decide how it gets rendered out so if we have glass use class. If we don't, but it's still uh iOS, then we're
1:15:22
going to use a blur view, right? Uh and then if we don't have the blur view, for example, if we're on Android, it will
1:15:28
render out to a normal view. So, you see this is what we do because obviously we're trying to build one code base for
1:15:33
everything. Now, how do we get the haptics working? Well, in this case, we can go to here and we can simply type in
1:15:38
haptics. So, you see it's actually here. Expo Haptics, a library that provides
1:15:44
access access to the systems vibration effects on Android, the haptics engine iOS, and the web vibration API on the
1:15:49
web. Because by the way, it also does compile down to web. Most of the time when I do expo work, I'll be honest, I
1:15:55
tend to just build for iOS and Android, but you can build for iOS, Android, and the web all in one go. Yeah. Um, so in
1:16:02
this case, we're going to install the Expo haptics. Okay. So, command J MPX
1:16:08
expo install haptics. And then over here, we need to create
1:16:13
this lib, right? So, let's go over to our lib and I'm going to create a haptics.ts
1:16:21
file. Okay, haptics.ts.
1:16:26
And then what I've done here is I've just created a big helper file to be honest with you. So, what we're doing is
1:16:31
we're importing all the haptics. We've got the platform access and then we've got different ones. Haptic light if
1:16:37
platform is iOS haptics and we're doing it like so right. Um this is running it
1:16:43
all for iOS but in this case look for the dating app hoping for swiping on a profile card liking a profile rejecting
1:16:50
when a match is made haptic success and so forth. Okay. So um by the way yeah
1:16:56
the reason why we're saying haptics um and these are like a bit more of a vibration. These are all like
1:17:01
vibrations. These ones are actual like the haptic feeling, right? So, now that we have that, we're good on that front.
1:17:09
Let's go back over here. And then from now, we should have one of these at least working. So, we have glass button.
1:17:16
So, glass button. Yep. So, glass button. So, what I'm going to now do is basically pull in the rest of them.
1:17:22
Glass chip was those little interest chips that we used, you know, before. So, I'm going to save a bunch of time
1:17:27
here by pulling in the rest of the components now. So, we're going to copy. I'm going to pull these in. So, we got
1:17:34
glass back button. Same similar approach. Let's just jump through each one to make sure we have everything. We
1:17:39
need to create lib glass. That's one thing I need to do. Glass chip. Another one. Glass close button is also sorted
1:17:46
out. So, we need the Yeah, we need the glass library for some of these effects to work. And
1:17:53
then otherwise, the rest of it is pretty easy. Yeah. So in order to get that done, let's go to our lib and let's
1:18:00
create a glass lib. So glass.tsx.
1:18:07
And then here what we have is uh our imports supports the glass
1:18:12
effect. Here's liquid glass available. Right. Um common fallback styles for non-glass UI elements. So basically what
1:18:19
we've done here is I've just centralized the styling so it's a bit more easier as opposed to and really I should have
1:18:26
actually used this a bit more throughout some of the other components. So I I realized I did this afterwards. Uh and I
1:18:31
should have refactored. I I go through rounds of refactoring with these builds by the way. Right. And I do use AI. I do
1:18:37
a big planning job when I do that and then we get it done. So glass fallback.
1:18:42
We've got some styles here and then we've got the adaptive glass view. So if you look at this, this is the main thing now. So adaptive glass view the renders
1:18:49
glass view on iOS 6 falls back to blur view and uses a solid view on Android or the web. So you see I actually should
1:18:55
have used this previously in the other area. Right. So here we have glass
1:19:01
effect style and that's freaking out why exactly. Let's see. I think oh I didn't actually fix that on my one as well. But
1:19:07
mainly the thing is if it's iOS 6 it's going to use liquid glass otherwise it falls back. Otherwise, if we're on iOS
1:19:13
6, I'm sorry, less than iOS, but we're on iOS, then we use the blur view. Okay.
1:19:19
And then uh Android is the fallback. Okay. So, this one is freaking out because regular prominent is not
1:19:25
assigned to D. So, in this case, it's not assignable to what have I done here?
1:19:31
Regular. So, we could do regular prominent.
1:19:37
So type prominent is not. So let's just
1:19:43
apply that to the chat and see what it can do. Interesting. Um I'm using the regular
1:19:51
but perhaps it's just a loose string. It needs to be casted to what is glass
1:19:56
style I guess cuz right now it's just a regular probably. It needs needs to be glass style I guess. Well, most likely.
1:20:05
Yeah, that's that's all it was. So, we we can stop that. Yeah.
1:20:10
So, typically even though the strings were correct, it just needed to be casted to the correct style. There
1:20:16
wasn't strong enough of a cast, right? So, there you go. There we have the glass working. Now, go back back. And
1:20:22
now we have our glass components. So, heading back now all the way to code verification.
1:20:29
We can see down here everything is rendering out. So let's import the code verification. So now when we have the
1:20:36
2FA screen, it should pop up that screen. Okay. Uh and then underneath we
1:20:42
have the rest of the app. And you can see shadow primary doesn't exist. We'll fix these issues afterwards. But let's go ahead and figure out this bottom half
1:20:48
of the signin page. Right. Uh it's not honestly this is really presentational here. So if I go to the sign in uh let
1:20:57
me pop in my version of what I have. So firstly I want to check if the input is valid. We've got a simple is valid
1:21:04
check. Uh you can probably make that more efficient but in this case it's fine. And then I'm going to pop in our
1:21:10
entire I think I've already done it. Yeah. Animated view. Fade in down is going to be from React Native. Animated
1:21:16
reanimated scrolling down. Fade in up is also from React Native reanimated. And
1:21:22
we've got haptic button press. Okay, so haptic button press comes from lib.
1:21:29
Need to import that from our haptic library which we just added earlier. Shadow primary
1:21:36
um is actually from I believe our shadows here. So what I done is we were using lots of shadows throughout the
1:21:42
app. So we should have a styles folder. Nope, not in here. So the top level
1:21:49
styles. Uh and then or actually it's inside of lib. So lib
1:21:55
styles and then inside of there I'm going to have an index.ts
1:22:01
and also a shadows. So the index is basically uh or put point simply is just
1:22:07
a simple uh box um what are they called? H the
1:22:14
the importing where we have it barrel export right and then we have shadows.ts TS which is just consistent shadow
1:22:20
styles that I can reuse. Okay, that's all it is. So these are just consistently so that way in case I was
1:22:26
to go ahead and use the same shadow elsewhere, I don't have to keep repeating this. I can just say use shadow small for example, right? So we
1:22:33
can go ahead and do that. That now work. Um,
1:22:41
and why is that freaking out? Shadows.ts. Let's do um
1:22:47
restart. Uh okay, so this is a good question. So
1:22:53
I want to use clerk. It's awesome, but most of the time my clients are users are not comfortable sharing his details with third party packages. I'm stuck in
1:22:59
privacy issues. So here's the thing, right? Most of the time your client is
1:23:04
probably asking you for Google, you know, it could be it could be social login, Google login or support for like those kind of things as well as, you
1:23:10
know, the normal uh Google password sign up, username password signup flow. What
1:23:16
they don't understand is they don't understand the tech. That's the truth. They don't understand the tech, right? So, I would definitely recommend when
1:23:22
you're negotiating with a client or you're talking to a client, it really depends on the level of privacy that is
1:23:28
required. If it's like a government then fair enough. It's a bit of a different situation, right? Then maybe it might be
1:23:34
worth to implement um either clerk's enterprise sort of set of uh side of
1:23:39
things. So you can have you know sock 2 and those kind of uh privacy and data handling uh practices in place which by
1:23:46
the way they have right or do not build it yourself is my is my point. You will
1:23:51
much more likely land yourself in some serious trouble. But the thing is your client should not be understanding what
1:23:57
the backend tech is. They should not be discussing with you what clerk is, what convex is, what expo is. You should be
1:24:04
discussing the product with them, right? As opposed to trying to explain what
1:24:10
tech stack is. That's the biggest problem that I find happening with a lot of uh developers when I talk to some of
1:24:16
my students is they're like, "Yeah, but I told them we're using convex." Cool. They have no idea what convex is. They
1:24:21
don't know any of this stuff. You have to talk product to them and then you have to have a translation layer where
1:24:27
they don't need to worry about things. They can kind of just, you know, trust that you're going to handle it. You need to educate yourself on what is secure
1:24:34
and what is not. Clerk is secure, guys. It's absolutely secure.
1:24:41
It's used by some huge companies. Vel, stripe, you know, tons of big companies using clerk.
1:24:48
So if you have to ask yourself, are those companies secure? and then move from there. Okay, so here we have our
1:24:55
login page. Cool. Let's go to our signup page. And it looks awful, right? So the signup page is next. We're going to do
1:25:02
the same thing to get past the signup page so we can start getting into the the the niceness of the app. Um so we've
1:25:09
got some default options being shared in the chat. You can feel free, again, you can feel free to use whatever you want.
1:25:15
It's completely up to you. Uh in this case, um we we just I I love Clug. I've
1:25:21
used them a ton in production. I'm gonna make this export.
1:25:26
Sign up.
1:25:32
Okay. So, um, now in the signup screen, it's pretty
1:25:38
much the exact same to be fair. What I'm going to do here actually is replace this with our signup. So, I' I've
1:25:46
replaced this with the code that I have in my uh, GitHub. and I'll run through
1:25:51
it exactly now. So firstly, this is Why is this freaking up? So styles shadow
1:25:57
primary. Let's go down to here. Import the shadow.
1:26:05
Cool. Okay. And then let's hit a refresh.
1:26:11
Go to sign up. There we are. Okay. So you see this glass button that really nice, right? So there we have it. Okay.
1:26:18
So let's jump through what happened here. So firstly haptics on the sign up is what I added. Then we've got the
1:26:24
handle verify. We already know how that works. Pending verification. Same thing. We have is valid. And then we have the
1:26:30
password strength which is a new one I added where basically we're just checking password length. Okay. That's what we're basically doing. Uh when we
1:26:37
pop in the the uh following. I didn't create these terms and service pages, but you can just make them simple links
1:26:43
where or externally link to your page on your website or something, right? Then we've got the keyboard
1:26:49
avoiding view here. I did a mistake. So again, this is I built the built this
1:26:54
earlier. This one should be our keyboard aare view to save ourselves this
1:27:00
headache, right? So keyboard aware view. We should be using that. uh transform error d I made a mistake down here
1:27:09
keyboard view you see save ourselves a headache but you see that nice little reanimated
1:27:15
nice little uh kind of drift in right so you can go ahead and do those things uh
1:27:22
very very simply by using the animated view like here you see fade in down delay 50 duration 400 and you can change
1:27:29
that to be 900 for example you can make it spring and so forth so now if Good to go here. Sign up. You see how it's a
1:27:36
little bit I mean I guess it was a bit faster but that was actually just the back button that slowed down the actual logo section. You see you can make it
1:27:43
springify. So now if we go back oh it's actually yeah you see how it kind of like I mean it would didn't
1:27:48
really happen but in this case it could kind of bounce like so. Right. So there you go. Uh the Google sign in and the
1:27:56
Apple sign in I haven't uh implemented. In this case we just go back to the thing. uh but you can go feel free to
1:28:02
implement these very very simple and what I'd recommend you do command I simply go and uh do a new page and say
1:28:09
literally this implement Google sign in and Google sign in let's just start with
1:28:14
for clerk and then you can say at rules uh oh no it's actually different now
1:28:20
it's clerk uh you can say use clerk's mtp right and
1:28:27
if you just do that like it will already use clerk's mtp P, but I'm very explicit with it. Uh, if this will do it
1:28:33
perfectly without a doubt, this will literally install the whole thing for you and then you don't have to stress about things. And then again, what do I
1:28:39
recommend you do whenever you're coding like that, you are committing. So in this case, like right now, I haven't committed anything, right? But let's
1:28:45
just assume I have a fresh slate. So in this case, like imagine I committed before this. I tend to work in
1:28:52
checkpoints, right? So I'm going to teach this in principle now. So let's just say I've got clean branch right now
1:28:57
and then I implemented something else. So I said like implement Google sign in
1:29:03
using Klux MCP. Right now every change that it does I now have a clear review
1:29:10
structure here. Now yes you can if you press command D and go into agent review you can actually let it finish itself
1:29:16
and click the review button and do it that way as well. But I just like to have my commits based on what my agents
1:29:22
are doing. So it's a really nice kind of separated approach. And then the reason why that works well because if you once
1:29:28
you start getting a pretty advanced in the kind of AI agent usage side of things, you can use git work trees to
1:29:34
separate concerns. So each different feature is effectively a task that an
1:29:39
agent has finished. And then what you have is a really nice kind of commit kind of setup where everything can just nicely merge back in and nothing is
1:29:47
conflicting or provided you're not messing with the same files. And again, AI will help you cover that as well.
1:29:53
Okay. So, I'm let me know right now by the way in the chat. Are you liking the new style? So, are you liking the highle
1:30:00
explanation as opposed to line by line coding? I think it's way more useful for devs and I think it's the way to go
1:30:07
moving forward. Um, yeah, we're trying to evolve the channel so I can show you the reality of how we code now
1:30:14
as well. Okay. Um, cool. Now, let's move on to the actual testing the signup. So
1:30:20
let's create an account. So sunny. Uh +1gmail.com.
1:30:27
And then I'm just going to do a password here. ABC dot dot. Okay. Now create account.
1:30:33
Password has been Oh, use different password. Okay. So I just used that one. Some
1:30:42
create an account. There you go. I'm going to save that. Oh, I should have saved it anyway. Uh Jay, if you could
1:30:47
give me that please, that would help me out a ton. So while that's happening what we're going to do is we're going to
1:30:52
prepare the next screen which is the onboarding right and how do we determine the onboarding flow. So step one we have
1:30:57
the protected side. So if you're signed in or if you're not. Okay now when we get signed in which will happen after I
1:31:03
put this code in. What will then happen is we will get redirected to this. So you see how it will then scan the app
1:31:10
again. We say oh you now you're signed in. So I'm going to redirect you to the app. So layout tsx right. So, this one,
1:31:17
um, let's go back over here and let's just pop in that code so we can
1:31:22
continue. Thank you, Jay. Um,
1:31:29
let's just enter it. 656. There we go. Verify email. Now, there
1:31:36
you go. We got to the start page. Now, if I was to hit refresh, you should you'll see how straight away I go into
1:31:42
the start page. Now, I don't go to the sign in, which is awesome. That's what we wanted. Okay, so now we're we're past
1:31:47
that. Now we're into the app flow. So you see how we can have these flows in our app. And this is why expose
1:31:53
protected routes are just a must. Trust me, your LLM will likely sometimes go
1:31:58
running off and build like redirects where basically if you're not signed in, it'll redirect you to the login page.
1:32:04
Don't do that. Use Expose protected routes. It's so much better. And not many people talk about this, but you
1:32:10
need to be using it because it's so clean. Uh so yeah, that's my that's a must for me. Like uh all my students, I
1:32:17
will scream at them if they do redirects. Use explored routes. Okay, it's also way nicer in the app. You
1:32:23
don't get that glitchy little sort of like redirect happening when it loads. All right, so let's go to our app
1:32:29
layout. Now, what we want to do here is this is where we're going to have to start introducing convex into the into
1:32:34
the scene, right? So here we're going to have two things. We're going to have the use user and we're going to have the
1:32:40
apps theme. Okay. So, use user comes from clerk and then the app theme comes from our lib. And now what we need to do
1:32:46
is get the users uh get the user their profile. Okay.
1:32:53
So, we need to basically get a user's profile. So, I'm going to pseudo code this with you for a sec. Right. So,
1:33:01
yeah, I'll explain it in a moment. So, the use query is basically going to be a real-time listener to Convex's backend
1:33:07
database. And what this is going to do is we're going to go ahead and get the users uh get by clerk ID. So we're going
1:33:13
to pass our clerk ID of the logged in user and we should be able to get the user's profile. Now once we have the profile, I'm going to check has the user
1:33:21
on boarded already or not. If they've never on boarded, they should go to the onboarding rounds now. Okay? Otherwise,
1:33:27
if they have a profile, load the main app. Okay? So let's do that. Uh and also
1:33:34
somebody uh Jerry said what is the can you I'm a little bit late but can you explain the extra app directory? Yeah.
1:33:40
So this one is the overall app directory top level. Once you jump in here what we
1:33:46
have is we have grouped folders. So basically I have a layout.tsx here. We have two protected uh routes. One is
1:33:53
orth one is app. Okay. So everything under here is falling under this guard.
1:33:58
Everything under there is falling under that guard. So when we're not signed in, the user gets directed to these routes.
1:34:04
When we are signed in, the user gets directed to these routes. Then it goes into the next layout. And then basically
1:34:10
the layout hierarchy unfolds. Okay. So use query is next. So what we're going
1:34:15
to do now is set up convex. I love convex. It's awesome. Right. I feel like everyone's jumping on the hype now, but
1:34:21
I was an OG with convex. They're pretty cool. They reached out. We worked with them before. We're not actually working with them, by the way, right now. I just
1:34:27
like them. They're pretty cool. Right. So, npm create convex. So, start building. Um, I'm going to create a I've
1:34:35
actually logged in already. Um, but let's just do it again. So,
1:34:42
I would love to do some cool stuff with them again. So, in this case, we go to Oh, by the way, guys, use this code. Uh,
1:34:48
Jay, feel free to pop this out. Feel free guys, use that code. Uh, Jay will
1:34:53
chuck it in the chat in a moment. Even I can check it in. I don't know why I'm saying that. There you go. Use that code. uh when you're using this and
1:35:00
it'll help me out a bit. So in this case, let's create a project. Let's go ahead and call this project um
1:35:07
AI dating app. Yeah, AI dating app YouTube. Create. As you can see, I use
1:35:12
it a lot. Ah, damn it. I've got one. Um let me delete a project. An old one.
1:35:21
I don't even know what this one is.
1:35:27
Delete. Okay. Uh, create project. And by the way, if you're wondering, are these guys production ready? I use them a ton in
1:35:34
production. So, yeah, they're production ready. Uh, they handle scale. I didn't
1:35:40
YouTube creating. And now we have that done. So, next step is we need to install Convex,
1:35:46
right? So, we can go to convex get started simple guide. They have an
1:35:52
awesome MCP as well. So in this case we go to React Native. Yes. And then here
1:35:59
create a React Native app. We've done install convex and then MPX convex step. So go into our app pmm install convex.
1:36:11
Oops. Uh pmppm install comx.
1:36:17
Quick little water break.
1:36:24
Okay. So, what's next is we have
1:36:34
now we can pull in uh some convex stuff in a moment, but we need to actually
1:36:39
spin up our convex. So, use query. Let's just see do we have it correctly
1:36:44
installed. Yeah, firstly we do have it correctly installed. And then next thing we need to do is in our first we are going to be
1:36:52
uh this is the server that's running the app. And in our second we're going to have a server running convex. Right? So
1:36:59
convex is a real time sort of back end. So I do pmppm convex
1:37:05
dev. Now let that do its thing and it will if
1:37:12
you're not logged in it will prompt you to log in. So in this case I've already created a project now just in front of you. Sunonny Sanger's team AI dating app
1:37:20
YouTube boom and then reinitialize project provision the dev account added
1:37:25
the environment files so if you see in the M file boom we have our environments and what I like to do here guys is more
1:37:32
so do this so I like to kind of use the following like this
1:37:41
yeah and then see convex is ready to deploy and start okay so now Now that
1:37:47
those two are open, I like to create a separate one. So I have this running my apps. So I can kind of come in and check
1:37:52
on the status of things. If you have multiple screens, this is the ideal time. On another screen, I have things
1:37:58
running, right? So typically I have another screen running where all my stuff is, right? So you can see um that
1:38:04
was an example of another screen pulling in that stuff. Cool. So heading back
1:38:09
over now, we can get into it. So you can see this is typically how we start querying and all that stuff. Now the the
1:38:15
step that we need to do is wrap our app in the convex provider. So remember those app providers that we set up
1:38:21
earlier. We need to go back to that. Okay. So let's go back over to our
1:38:28
providers. So it was actually in the index. So here then we had app
1:38:34
providers. Okay. So step one, we actually forgot to do a step here. So I actually want to have a gesture root
1:38:40
view. Uh we need this for a few things later. So, let's go ahead and pop this under like so. And the gesture root view
1:38:48
comes from React Native gesture handler. We don't need this import react from React. Oops.
1:38:58
Oh, that's interesting. What is it? Oh, what? Whoa.
1:39:07
What is happening? Okay, one minute.
1:39:16
my uh I didn't mean what the hell what is
1:39:22
going on there providers.
1:39:29
Okay, I had a weird situation there. But effectively what I've done is all I changed is this one was correct. This
1:39:35
one was already there. Theme provider we I will show you how to add in. Um and then convex provider is what I'll
1:39:41
create. That's super strange though. Convex provider is the one that I need to create now. Okay. Um, yes. So, convex
1:39:50
provider, super simple. Go over here. Convex provider. TSX. Again, we just go and grab the convex URL. We check if
1:39:57
it's there or not. And then we create a convex react client. And then we basically have a wrapper. Convex
1:40:03
provider with clerk is what we're doing. Okay. So, we have a wrapper that works with Clerk, which is much nicer. Okay.
1:40:10
Now once that's done, we have something called a theme provider. Okay. So the
1:40:16
theme provider uh and also just want to show you the convex provider here. Convex react
1:40:22
client. Um
1:40:29
yeah, you see here convex react look. Yeah.
1:40:35
Now we have the theme provide. I'm just wondering actually, do we still have the I think we still need the convex
1:40:42
provider above it though.
1:40:53
No, I think we're fine with that. Yeah. Okay. Um, so next up, the theme
1:40:59
provider. I went into deep thought there. Okay, so that's good.
1:41:05
Uh, what's that freaking out about now?
1:41:13
There you go. And then the theme provider is next. So for theme provider, we just have
1:41:18
something called the navigation theme provider. And this will just pop in our
1:41:24
color scheme into our app based on if it's in dark theme or light theme. right
1:41:29
now for this one. Again, you might have to just restart your TypeScript server sometimes to get
1:41:35
things working. I find that that happens a lot. So, now that we have that down,
1:41:41
okay, we should be better off. And then heading back in, you see this API? If we
1:41:48
go ahead and import, so control spacebar, you can see it pops in here
1:41:54
because when we're running that server, what's happening is is it's actually going ahead here. It's actually going
1:42:01
ahead and uh generating based on uh what we have inside of here. So, this generated photo is constantly updating
1:42:08
based on what we change inside of our convex database. Um, and that helps out a ton. Uh, Tetron says, "Oh no." Not
1:42:16
sure why. Um so here we have the API and we don't have our uh API set up
1:42:21
basically our convex side of things right so we need to set up what is the convex like what is the database look
1:42:27
like right what what's the data look like how are we storing that data uh you know how are we querying so we have what
1:42:33
queries mutations are we going to have that go basically allow me to get data and so forth okay so we can kind of step
1:42:39
out of convex here go back to the app you see like different tables and the convex is very powerful you can do loads
1:42:45
of stuff with it but I'm going to break break it down because there's quite a lot we need to do today. So, heading back over, we need to go to
1:42:53
Convex and then step one is inside of Convex. Uh, I actually want to teach you
1:42:59
before we even do that, Convex MCP, Convex MCP server. Install this, right?
1:43:06
Click on add to cursor. It's as simple as that. Or follow these commands and then you'll have it inside of your
1:43:12
settings. And this is a must, right? No joke, it's an absolute must because this
1:43:18
right here, it's so powerful. It's crazy, right? So, if you haven't authenticated here, it will ask you to
1:43:25
authenticate. But, um, it's so awesome. And I'll show you exactly what we can do
1:43:30
in this. It can now our LLM can jump into our back end and basically start
1:43:36
querying, seeding, doing things for us. It's incredibly powerful. uh and it's an absolute gamecher for booming your
1:43:44
development speed. Okay. So now that we have that we can start carrying on. So what I was doing before so inside of uh
1:43:51
convex we are going to have a few different files. Now the main one is number one is users.ts.
1:43:58
Okay. So users.ts like this. Right now we can close it.
1:44:03
Generated. Now inside of here we're going to have quite a lot of stuff going on. Okay. So what in so I want to repeat
1:44:12
I want to show you the format that we're going to do once and then I'm going to repeat that format over and over again with just slightly different changes
1:44:18
each time. Okay. So step one get by clerk ID this one right here. Okay. So
1:44:24
we can import the query. So in this case actually um
1:44:30
from generator over here. So in this case we grab that uh v from convex values. And then you can see this is all
1:44:36
freaking out because we don't have any of this stuff set up yet. We don't have the the schema set up, right? So it
1:44:42
doesn't know where it's pulling. And what's this with the resolved photos? Yeah, I'll show you what's going on. So
1:44:47
effectively, this is how you write queries. You can check out the documentation or you can simply talk to your LM once you connect your MCP and it
1:44:54
will know what it's doing. But each call is basically a cloud function. Think of it that way. All right. So it goes ahead
1:45:01
and deploys a cloud function on convex and then we can pass in an argument. So clerk ID and then there's a handler that
1:45:07
can handle the result of that calling. Right? So in this case what we're going to do is we're going to get the context
1:45:12
go into our database query the users and we're going to use the index to go ahead and find that user with that clerk ID
1:45:18
and get the first response. Then we're going to return with resolved photos. So
1:45:24
this is kind of cool because I've got two versions of things. So you'll see me do it quite a lot. You'll see me do dot
1:45:30
first and it'll just return that or you'll see me return with the resolve photos. Why am I doing that? Because
1:45:36
basically sometimes resolving those photos means I have to expand the photo. So we're going to store photos on convex
1:45:42
as well. Uh now sometimes for example with that algorithm matching different
1:45:47
people together, we're not checking the images and seeing if people look alike. We're checking the profiles. So we don't
1:45:54
always need to expand the images which can be a load on our server. So now I'm going to have a lot of separation where
1:46:00
when we need the pictures I'll have this with resolved photos function and I'll show you how we can implement that and
1:46:06
then that way only when I say will it go ahead and expand the images. Okay so
1:46:11
first next up we're going to create a schema. So schema.ts. Now this defines
1:46:16
the entire database. So you can see that we got the user table, the matches, the swipes, the messages, the daily picks.
1:46:24
So here we have 1 2 3 4 five tables inside of our database. And what you'll notice is if I go over here, you see the
1:46:31
second I hit save, what it did is it started to actually create those tables in my database. Going back over here,
1:46:37
you can see we've actually got the tables in the database. If we go into functions, you can even see those cloud functions already deployed. So this is
1:46:44
what I love about CL combo, sorry, it works really quick, right? So now we've got the table indexes and you can see
1:46:50
that we've got these vector indexes for the embeddings. And all an index is by the way is it's just a quick way of
1:46:57
being able to search for something. We're basically saying to a table prepare for that. So that way when I do
1:47:03
come searching for that thing it'll be a lot faster of a lookup. Okay. So the
1:47:09
users table we have the following right. This is literally just all of the things that we store and in this case 1536 dim
1:47:15
vector from open AI and embedding. Okay. And you can see here for matches
1:47:24
we essentially store the user one ID, user two ID, the time they match that and the AI explanation. Okay. Uh and
1:47:31
then we also have swipes. We have messages as well. And then we have daily pics
1:47:38
which is the AI curated matches which is three per day. We have the user. We have the pics of the day for that user. We
1:47:43
have the generated and the expires out. And then based on that we're going to have a function running in the background which is going to be
1:47:49
generating for that user. Okay. So heading back over here. What is the with
1:47:54
resolved photos? How do we create that one? So with resolved photos, let's go to our lib photos.
1:48:01
So lib I'm going to create a this actually in convex. So this is
1:48:06
regarding convex. We need lib and I'm going to have a photos.ts.
1:48:11
Okay. Now inside of here what we do is we have our doc id query context from
1:48:19
the server. Right? Now what we have the first one result photo urls. It takes the context and photos and this is
1:48:24
essentially this. So you see this context, right?
1:48:29
And then it takes the user details and we go over here. You can see we've got a couple. We've got resolve photos, we've got with resolve photos, and we have
1:48:37
with resolved photos array, right? So we call this one from our back end. If there's no user, we return the user.
1:48:44
Otherwise, we have resolved photos equals await resolve photo URL. So a
1:48:49
helper function internally. And then eventually we return the user alongside their photos. So if we go to resolve
1:48:55
photo urls here we have promise.all and what we're doing is we're mapping
1:49:00
through and we're running this in parallel right. So for every single photo we're mapping through and we're
1:49:06
basically saying if it's already in your a URL keep it as is right. So if the person's upload an image is already
1:49:12
saved as a HTTP or HTTPS file then that's fine just keep it right otherwise
1:49:18
it's something called a storage ID. So typically with all of these storage providers, whether it be something like
1:49:24
uh Google cloud, whether it be AWS, we don't store the URL. What we do is we
1:49:29
store something called an ID, which typically refers to the ID of that image, right? And it's stored somewhere
1:49:36
else in a bucket or something. And then what we do is we use the API or the SDK to go ahead and get a URL using the SDK.
1:49:45
So in this case, context.sto.get URL. We pass the photo and then it will return us the URL. Okay, locked in from
1:49:53
Kenya. Yo, what's up, dude? Quick little water break. And also, the likes are flying. Keep on smashing that like button, guys.
1:50:01
Okay, so the final one is going to go ahead and
1:50:07
do user.map with resolve photos, and it will just return us back the uh array.
1:50:13
So actually it will return us back uh all of the users with those resolved
1:50:18
photos. Okay. So these are helper functions. So these are the two that I spoke about. We have many more. So we
1:50:25
have like I'm going to just pull these in now and I think we should be okay
1:50:31
up until certain point. So I'm going to pull these in and yeah. Okay. We yeah
1:50:37
there's quite a lot to do. So um get user by ID. Very simple.
1:50:43
get internal. Now internal query is different. So an internal query means
1:50:48
this is not exposed to our client, right? So any if a normal query we can
1:50:54
call that from a client. An internal query we can call it from the function dashboard on the back end. That's not
1:50:59
deployed right now because it has got some errors that we need to fix over here. Um but these can be internal for
1:51:06
actions but they can't be done they can't be uh called from our client and
1:51:11
this is more secure by the way. Okay. Then we got get internal with files create profile. This one is important
1:51:16
for when we create the user. Okay. So it takes all of their details and then it basically will handle the following. So
1:51:22
we've got the promise ID. Calculate age is a utility that I need to create and then it will insert the
1:51:29
user into the database. Right. And then we have create profile with embedding. And actions are pretty powerful. So
1:51:36
action is effectively like a server action like a cloud function. Um that it's like a an executable, right? So
1:51:43
create profile with embedding is basically we can call it and what we're trying to do here is we want it to go
1:51:49
ahead and uh build the profile text. So this one I I'll show you what we do
1:51:54
here. And also to generate embedding, we take the user's profile and we generate a vector version of them like a
1:52:00
basically a sequence of numbers that represents that data. And why do we have vectors? Because what we what LLM understand better than us is if I have
1:52:07
Sunny over here and I have a potential data over here. I have all of Sunny's interests and his profile, his
1:52:13
description, his bio, and I've now turned that into a sequence of numbers that represent all of that information.
1:52:20
I do the same thing to this match. And now I've got all of these numbers over here, all these numbers over here. We do
1:52:26
something called a comparison check where we check the vectors. Are the vectors of this one over here similar to
1:52:32
the vectors of this one over here? And that is effectively what LM do under the hood. They're just checking words that
1:52:37
are similar to each other. They've been trained on millions and billions of different data sources, right? Uh and
1:52:42
that's how they're able to literally speak and do what we need to do. So that's what we're doing effectively. We
1:52:48
we take Sunny, turn him into a vector. we take someone else, we turn them into vector members and then we do a comparison and then it'll come out with
1:52:55
saying ah they're actually 60% uh compatible and so forth. Okay, so here
1:53:00
we have the internal functions as well. Mutation is typically whenever we want to have something mutate uh anything on
1:53:08
our server, right? So in this case this is for when we uh update the profile and
1:53:13
then down here update embeddings in this is when we want to edit our profile. So when we click save after we edit our
1:53:19
profile details that's what it's calling same with internal action this one is
1:53:25
required for us when we want to uh regenerate the embeddings after the profile changes. So we need to create
1:53:31
these two helpers build profile text and generate embeddings. Okay so let's do
1:53:37
that. So we've got a utils function inside a convex with a couple of
1:53:42
helpers. Number one let's go down here and start from the bottom. build profile
1:53:47
text. All this is doing gets our bio, gets the interests, and it just joins all the interests together. It'll
1:53:53
basically pop in my bio, and it'll take the interest, and it just joins all of them together. So, you'll have uh one
1:53:59
line of text, which is similar for every single every single person, but it'll be different based on their bio and their
1:54:04
interests. Okay. Then we have the get default uh date of birth. These are literally to just take date of births
1:54:11
and calculate the ages. That's what we're doing here. Okay. Uh this will take our date of birth that we added
1:54:16
into the system. It'll calculate the age, right? Get from uh get other user
1:54:22
ids. It's just a helper function. Get the other user ids from a match document. And then this one is
1:54:27
important. Get all matches for a user queries both user and user two indexes. This handles the birectional nature of
1:54:34
the matches table. Now what is that birectional nature that it's talking about? Well, this means effectively,
1:54:40
okay, let's say for example, Sunny wants to match with people that are 25 miles away from him and not further because I
1:54:47
don't want to, you know, maybe date someone who's like halfway across the world, right? Uh, and then let's say,
1:54:52
for example, someone else doesn't mind dating someone who's halfway across the world. Those two people should not be
1:54:59
matched because they should not be seen on each other's profile because the preferences don't align. It doesn't make
1:55:05
sense. So this is what we're effectively doing here. We say contest DB query
1:55:10
matches with this person. So and basically this is where we uh get all
1:55:15
the matches for user matches. We're querying the matches and
1:55:22
getting all of the matches for one user and then we're getting all the matches for a second user and we return all of
1:55:28
the matches together. So this will come in this will make a lot more sense when we come to that point. Okay. So firstly
1:55:35
let's import these utils generate embeddings we need to create this one is
1:55:40
important generate embeddings this is where openAI comes into the picture so
1:55:45
openai.ts TS. So firstly we need to import this or add this actually. So uh pmppmi open AAI and now we need our
1:55:54
openi API key. Okay. So we obviously you don't want to do expo public from this.
1:56:00
And also this API key is on convex's side not on uh because look it's inside
1:56:07
of convex right this is not on our local machine side. So this is actually on convex side. So text embedding three
1:56:13
small is what we're using for the embedding. Very cheap model. GPT40 mini very cheap model. Okay. Generating
1:56:19
embeddings. All we do is we call OpenAI. We takes this, we take the original text, we call OpenAI embeddings, we pass
1:56:25
in the model, pass in the input, and it gives us back the embedding version. Super simple, easy to do. Generate a
1:56:31
chat completion. This one is takes a prompt, some options maybe, and then
1:56:36
basically we can pass in the message of the user, and then it can just go in. And I don't think we even use this one
1:56:41
to be fair. It was more just generated as a backup in case we needed it. Okay,
1:56:47
now we need the open AI API key. So go into our history or settings, go into our environment variables, add open API
1:56:54
key, and then this is where I need to put in my key. So what I want you to do then is go to um
1:57:01
go to plat oh god go to platform.opai.com openai.com
1:57:08
and you can use Claude and switch it up and you know use Claude if you want but I'm going to teach you with OpenAI.
1:57:14
Go to API keys. Go to create new secret key and let's just call this one YouTube dating app key project. Create secret
1:57:23
key. I'm going to hide mine obviously. Okay, you thought I was going to slip. I copy my key. I go back now to
1:57:33
where I was at before. So I go over here and I paste in the key
1:57:38
and I click on save. Okay. So now I paste in the key. I click on save and
1:57:44
now I have that key saved in here. All right. You do not want to expose that
1:57:49
one because that'll be your billables. Right. So now that we have that in play, let's go back to our functions. Did it
1:57:56
deploy our stuff? Let's see what went wrong. So it said uncore reference internal mutation is
1:58:03
not defined. So in users, we forgot to generate embeddings. Let's pull that one
1:58:08
in. Calculate age. Pull that in. And yeah, now hit save. Uploading functions
1:58:15
to Convex. Finalizing push. And now, haha, we have all of our functions being
1:58:21
deployed. And you see it's it's incredibly fast and powerful. So not only do we have the data, now we have the functions being deployed. So you can
1:58:28
have chron schedules, you can have loads of things. So really incredibly powerful back end. Okay.
1:58:34
Next up, we need to we've got the users ready. So, we can go back to you can
1:58:41
feel free to use Gemini, whatever you want. You can just swap out the back end. Right. Let's go and get rid of
1:58:46
this. This one is freaking out. Why exactly? Interesting. I shouldn't be freaking
1:58:53
out. Okay, so uh
1:59:04
Okay, I guess we need to tabs. Here we are. Now go all the way
1:59:10
back to the layout. Right now, we're back on the app. So, we had to go on a bit of a tangent there to come back to
1:59:15
where we are now. So, we've logged in and then right now we just see this on
1:59:20
the screen. So, we just see, you know, a blank screen, right? Why? So, we see the
1:59:26
the tabs right now, but we shouldn't see the tabs. You should see on boarding because we haven't got a profile. So if
1:59:31
I go ahead and type in console log profile okay and command I you can see that no
1:59:37
we have no profile. Okay so the user has no profile. So what does that mean? Well
1:59:44
it means that now we need a protected block. So we need to basically firstly say while it's loading I'm going to go
1:59:49
ahead and show something on the screen. So I'm going to have a simple view here.
1:59:54
Um, and an activity indicator is simply a spinner. Styles.loading. I'm just
1:59:59
going to add some styles at the bottom of the page. Stylesheet. That's because I haven't
2:00:04
imported stylesheet.
2:00:10
Okay. And now has profile while it's loading. So, if we hit refresh,
2:00:17
you see that's loading the profile. And it didn't find a profile. But right now, it's just rendering the stack. So we
2:00:23
haven't got any protected blocks. So to get around this now what we do is we have the following. So we're going to have protected stacks. We have an
2:00:30
overall stack with screen options header shown false and then only show the on boarding when no profile exists.
2:00:37
Otherwise we render out the main app. If you do have a profile then we render out the tabs edit profile chat screen and
2:00:43
the profile screen. Right. And the profile screen is going to be a modal presentation. Okay. Well,
2:00:51
I didn't actually mess around with that, but anyway, my tooth is hurting so bad. Wow. Okay, so uh stack door.creen name
2:00:59
on boarding. So now if I hit refresh, ah it's going to load and it's blank
2:01:06
because it doesn't have a page to go to. Okay. So what we now do is we create the
2:01:11
onboarding page. So I want to have a layout parent for the onboarding page. I
2:01:17
could just put uh an onboarding page here. But instead, what I'm going to do is I'm going to have a onboarding. So,
2:01:23
on boarding and then inside here, I'm going to have an index.
2:01:29
No, I'm going to have a layout layout.tsx. Okay. Yo, what's up guys? Musa and Jay,
2:01:36
what's Oh, yeah. I see. All right. And then inside the onboarding layout, here's what we're going to effectively
2:01:42
do, right? So we have our onboarding header which is going to be consistently used throughout. So I need to create that. Then we have the stacks. So we
2:01:50
have the parent stack and you see all the individual screens that we're going to effectively go through. Okay. So
2:01:56
we're going to start with the name, birthday, gender, looking for, age, location, bio, interest, name, photos, and complete. So a full on boarding
2:02:02
flow. Okay. Uh and then what we do is for the screen options, we say for every
2:02:08
single screen I want to have the head on boarding header gesture enabled. Yes. So I can swipe through animation slide from
2:02:13
the right and we're going to style it a bit. Okay. So let's create this on boarding header number one. So what I
2:02:21
have inside of my components is a folder called on boarding.
2:02:27
And now here we're going to have two components inside of it. On boarding header and question header, right? On
2:02:34
boarding header and question. So on boarding header I'll pop in here and show you. So the onboarding header has
2:02:40
all of the steps here. Now you could, you know, actually export this out into constants. Again, there's levels to you
2:02:47
can keep on refactoring up and up and up. But we have all the steps. We have a couple of things, the safe area inserts.
2:02:52
And we also have path name, right? Where are we right now inside the journey? And
2:02:58
then we get the current step from the path name. And we basically determine if we're on the first step, the last step.
2:03:03
And also how much are we p how how much are we progressed through on the on boarding right then we have our adaptive
2:03:10
glass view and you see now this is where we just reuse our components. So we have the adaptive glass view and then we
2:03:15
simply show the header and the style at the top with a progress bar. So this is a progress fill bar. Kind of a hacky way
2:03:22
of doing that but you can do that. And then we have the question header. So this is typically what we're going to be
2:03:28
asking them right. So here we have the question header. So, we have icon, emoji, title, subscri subtitle, delay,
2:03:35
and the margin bottom. And we basically have an animated view, but we pass in a header icon like so. And this is
2:03:41
freaking out because we're not actually giving the correct type of the icon. So,
2:03:47
here I've just said it's a string when really there should be a ionic icons,
2:03:55
but I think it's this one. Header icon component UI.
2:04:03
And then in here we're using ionic icon. So that's why it's freaking out. So this should actually be a key of type. So
2:04:10
that's how you fix that. Okay. Now once that's done, we go back. We can
2:04:17
simply just force that to refresh and then come back over here. And then
2:04:23
we have our onboarding editor. So what we should see if we hit a refresh again, it won't actually know a page to go to
2:04:29
yet. So it doesn't actually render anything yet still. Um but we should
2:04:34
have our first page. Now if you see here the first page is name that pops up. So naturally it's going to search for that
2:04:41
name page. So if we pop in a name.tsx and you can see like oh what's your name? Right. So how did that how do we
2:04:48
get that to come out? Well firstly that's the onboarding header with the progress bar. Right. And then because
2:04:54
we're on the first page it doesn't show a back button. Now, this is simply input fields with some presentational stuff
2:05:00
and an icon and an and a continue button. Okay. So, here we can see we're
2:05:05
essentially just going ahead and passing the user forward. Now, this is freaking out because it hasn't got the correct
2:05:11
mapping to the page itself. But this is actually not wrong. It's uh it's
2:05:17
actually correct. Um, it's just not picking it up for some reason.
2:05:25
Which is fine. I mean, for now, I'm just going to ignore that, but it does work cuz it will take us to the next page.
2:05:30
Uh, but effectively, we have a keyboard avoid uh aware view, which remember does the keyboard aware stuff, and then we
2:05:36
have the animated view. So, react reanimated makes things very, very simple for us, right? To be able to go ahead and do things. Then we have the
2:05:43
glass input fields. And yeah, we're good to go. Cool. So in this case and also sometimes I will need to create a
2:05:48
development build later on. So that's how we're going to get certain elements working nicely afterwards but we can
2:05:54
come to that afterwards. So I say sunny sa and let's click on continue. Ah and then it doesn't work because it tried to
2:06:01
go to the next page. Right. So obviously these are uh it's saying it's too many
2:06:06
pages because we don't have the pages built. Yeah. Okay. So it tried to go back. It tried to go to the next page
2:06:12
which was birthday. we don't have birthday right and that's why it's freaking out here as well otherwise it
2:06:19
wouldn't freak this is actually very good by the way it knows that we haven't created that page so which is a very
2:06:24
very powerful thing okay so next up we do birthday now firstly where is it
2:06:31
saving the name well we actually remember this is the clever part we're just collecting data every time we do
2:06:36
this right handle continue just pushes us to the next page with those fields so
2:06:42
we're not actually saving any data until the final step. Okay. Um, and you can
2:06:48
change this up, do it however you want, but this is how we we built this flow. So, name, the next step is birthday,
2:06:53
right? The birthday, we'll go ahead and have the again same thing, but now you'll see name no longer freaks out
2:06:59
because it sees it as a birthday screen. Okay, so if we go over here now to
2:07:04
components, we need to make a preferences one. So, data birth picker, right? So, here data birth picker from
2:07:10
component preferences. So, we're going to have these reusable components. called preferences. So inside of my
2:07:16
components folder, preferences, data birth picker. Well, firstly we need
2:07:22
a preferences folder. So here preferences and then I'm going to have a index.
2:07:29
Yep. Index.ts. And we got a couple of helpers here. Date of birth, distance, gender, and looking for selectors.
2:07:36
Right. So let's go ahead and build them up. Data birth picker number one. Data birth picker. So we need to we're using a React Native community date time
2:07:43
pickup. So if I go over here PM PMI I well actually before we do that I'm
2:07:49
going to show you. So firstly with these ones if you type in expo with the React Native community have built some pretty
2:07:55
cool things. You can see here MPX expo install. So for this stuff you actually want to use expose install because it
2:08:01
will install the correct dependencies across the board. So here you want to install using expose install.
2:08:09
Okay. And now after that's done for we need these date utils. So over
2:08:17
here uh we've actually just called ours utils. Why is this state utils? Uh I Oh,
2:08:22
did I repeat myself?
2:08:30
Inside of lib
2:08:36
date utils. Okay. the date utils are a new one. So in this case we've got the minimum age, maximum age, default age and then calculating
2:08:43
the age from the date and yes you can I have repeated code here in the other place. So you can easily refactor that
2:08:49
if you want to as well as is validated birth and so forth. Okay, so a couple of
2:08:55
checks and now that is correct. I don't know why that's still freaking out. Um cool.
2:09:04
Then we have the actual rest of it. So if we go over here, it added the config plugin. You see that plugin? So it
2:09:11
actually sets up a few other things besides just installing a dependency.
2:09:16
Um I also want to check one thing by the way. So when we did liquid glass
2:09:23
effect, we did do this. Yeah. Okay. Fine. So data birth picker is one and
2:09:30
you can feel free to look at how it works, but effectively this is handling everything for us, right?
2:09:37
Um, then we have the distance glider. Now the distance glider, we're going to
2:09:43
use the React Native community slider. So again, I just type in React Native
2:09:48
community slider. Expo pulls it up. And you can see expo install React Native community slider. And this is cool
2:09:55
because it handles just the complexity of a slider for us like when and it also works well with our um
2:10:03
glass look that we've done. So you can see this slider actually works well with the glass styling.
2:10:10
So there you go. And I've done it in a way by the way
2:10:15
where we have different steps. So it goes 10 25 miles 50 m 100 miles and then it goes unlimited. Right? And then we
2:10:23
got the distance label. Get distance index. This is for um which index your
2:10:28
selected effectively. So basically imagine you've got a slider. As you slide it, it will it will have to click
2:10:34
to an index which means it is which one did it was it closest to was it closest to 25 miles, 50 mi, 100 miles or should
2:10:41
it be unlimited, right? And this is the distance slider itself.
2:10:46
And then uh yeah, that's and then you can customize it like here you see steps and so forth, right?
2:10:53
And on the left side we've got 10 miles. On the right side we got unlimited. Okay. So then we've got gender selector.
2:11:02
Uh we need to create a preference helper for us now. So over here we just have
2:11:08
glass options you can click. But here we got the constants preferences.
2:11:13
So components preferences lib constants. Oh we need a
2:11:20
lib constant. So, lib constants
2:11:27
constants and then in here we have a preferences.ts.
2:11:33
Now, genders, you can add as whatever genders you want. I'm keeping it very simple.
2:11:39
Man, woman, looking for man, woman, or everyone, right? I'm keeping it super simple here. Type gender looking for
2:11:46
options. And then we've got the looking for to array. So in this case if the
2:11:51
value is everyone it'll just return woman and man right and then in this case it is a woman and man becomes
2:11:59
everyone. So this is like if you want to convert the other way if you need to right so that helps us out here we have
2:12:06
that now and then we just basically render out. Yeah.
2:12:11
So that's that down and then after that looking for is the final one.
2:12:19
And now I just want to mention as well sometimes we are kind of moving fast for it. If you do get stuck at any point you
2:12:25
can always just go ahead and you know for example here right I can go ahead and simply grab this command K and I can
2:12:30
say explain this to me and I do option enter and now it will actually explain
2:12:36
it in line. So you can see like this code renders this so forth blah blah blah blah blah you see and you can ask
2:12:42
follow-up questions and so forth. So use understand how AI can be used to not only help you code and be a really fast
2:12:48
developer but also help you learn in that feedback cycle that we tal about.
2:12:53
Okay. So now that's done. We got the gender
2:12:58
selector down. We can go ahead and restart our TypeScript server. And
2:13:04
that's all good. And then we go back to our page that we
2:13:09
were on. So app app on boarding birthday and this one is only freaking out now
2:13:15
because it hasn't got the next page. So naturally we build the gender page next and now we just progress through. Okay.
2:13:22
So on boarding let's do the gender page. Gender.tsx. You can see we've already
2:13:29
got everything else ready. Um and now you can see also it'll start to progress with us. So if I say sunny ABC continue
2:13:36
on your birthday. You see how it pops up very nicely and pop in this. It'll start calculating our age.
2:13:43
Continue. And then I am a man. Ah. Yeah. So in this case also we might need a
2:13:49
development build to get the glass working. So I'll show you how we can do that afterwards. Okay. So um oh actually
2:13:56
I could I guess I could show you that now. Yeah. So right now we're in Expo Go, right? Expo Go is great for
2:14:04
uh Expo Go uh is amazing for your first testing
2:14:11
sort of cycle, right? When you're you're getting things ready. Now, here Expo Go versus development build. What are the
2:14:16
differences, right? Why should you be concerned? So, number one, you can look at uh like they've got a pretty cool YouTube video where he explains
2:14:22
everything. You can go ahead and check that one out. Um but the main thing is is see you can use you can only use
2:14:28
libraries bundled in Expo Go. So in this case we we did a couple of expo installs
2:14:33
right when we do that we're installing specific libraries likely to iOS and Android liquid glass right and so forth.
2:14:41
Now when this happens you have to create a build. So there's a couple of ways you can create a development build. One is
2:14:47
with the EAS CLI. So export application services that one you can do that's absolutely
2:14:53
fine. Uh or you can go ahead and build it uh locally. Right. So, if you set things up locally, takes a little bit of
2:15:00
setup, but once you're done, you can go and actually build it locally. So, I've set things up to build it locally. Uh, if you want a tutorial on that, I can
2:15:06
feel free. I'll create it. Just drop a comment. Um, but then I can go ahead and actually run a development build. Now,
2:15:12
it's worth mentioning if you do once you switch to a development build, you will need to go ahead and have either an A
2:15:19
for an Apple uh if you're going to create an Apple uh development build, you have to have Apple developer account, which is I think it's like $99
2:15:27
for the year. Um, but you need that to sign off your build basically and allow it to create the build otherwise it
2:15:32
won't work. Uh, and then for Android, it's free. So, it really at this point you're not blocked. Uh, but that's what
2:15:39
to know about, right? So, maybe we don't do it yet. So I can keep showing you in XO Go and we'll do it when we get to the
2:15:44
point where I guess we're blocked, right? So let's carry on. Let's let's finish off the next uh few things. So in
2:15:51
this case, looking for is next. So looking for uh and then we've got the
2:15:56
age range. So age range is slightly the same as
2:16:01
well. And location is the next one which we need to really spend a bit of time on. So location here. So location is
2:16:07
slightly different now. So location is where we are going to have
2:16:13
the actual button determine where we are. So location granted. Now location
2:16:18
to get expo location working we have to do a few things. So what I want to do here is lib location. So we have to
2:16:25
create a a little helper for us here. So
2:16:33
location.ts expo location is what we're using. So, what I want you to do is go over to expo
2:16:40
location and here you go to the docs and you can see mpx expo install expo location. Right now, we have to
2:16:48
configure this correctly. So, a few things that we're going to do in this app location. You have to update the
2:16:55
permissions of the app so that way you request you know sometimes when you go request location for the user it pops up
2:17:01
on your screen. Do you want to allow this app to request to have access to your location? Same with images, right?
2:17:08
So, we have to do a few steps like that. So, here if you you can configure Expo using the
2:17:14
built-in config plugin D and then and so forth, right? So, here app.json. So, if
2:17:21
you go to my app.json, there we have plugins. Let's go to
2:17:26
plugins and you can see expo router, react native community, datetime picker,
2:17:31
expo location. Okay. So,
2:17:39
yeah, export location allow product name to use your location. Okay. Um,
2:17:48
and actually I did it wrong. Sorry. This should be in a bracket.
2:17:54
Yeah. So, it should be in a array like that because it's it's bundled together.
2:18:00
Okay. So, now that that is Augustine goes, "Hey, Sunny, how are you doing, brother?" I'm doing great. Thank you
2:18:06
very much. I'll be doing amazing if you guys do me a favor and smash that thumbs up and subscribe to the channel. Um, but
2:18:12
yeah, I'm doing awesome. Thank you for asking, dude. Um, so now we done that. Let's go back over here to our location.
2:18:20
Oh, I didn't run you through it. So, here request user permissions. So, await location request foreground permission.
2:18:28
Check location permission. get current location. So you see get current get
2:18:34
foreground and then get current position asynchronous and it'll return longitude
2:18:42
and latitude. Right. Then I've got a couple of helper things. I've got reverse geo code. Basically it gets the
2:18:49
city region information roughly. So you can feel free to look at that yourself. And then we've got region codes as well.
2:18:55
So it's going to basically try and find us the region code. There are libraries for this by the way. So you can feel free to like upgrade this. Request and
2:19:02
get location in one call. So that does it all in one call. Uh use location
2:19:07
basically just a bunch of helpers, right? Refresh the location as well. Uh
2:19:13
and use reverse again. Location coordinates to reverse, right? So these are all just helper functions. Yeah, I
2:19:19
kind of went crazy and started building a bunch. Um so next up we got the bio,
2:19:24
but let's actually test that bit out. So, hit a refresh. I don't think we need
2:19:31
to. We might need to actually. So, we'll see if we can we progress through. I'm a man looking for a woman. And then continue.
2:19:38
And then here, enable location. Ah, here we are. Allow expo go to use your location. Allow once or allow while
2:19:45
using app. Yes. Getting location San Francisco. Boom. Perfect. There we go.
2:19:51
Continue. And then we don't have the next page done. So, we have we have location working.
2:19:56
So now we have access to the longitude and latitude. Next up we need the bio. Right. You can also skip that element.
2:20:03
Right. Actually I don't know. I mean I don't think we should have skip to be fair.
2:20:08
Um yeah I I'll probably get rid of that to be fair. But um it's there in the code
2:20:15
just so you're aware. Okay. Next up we have bio. The bio. Here we have the
2:20:21
minimum length, maximum length. Little easy check. We're just doing it in line here. It's probably a better way of
2:20:26
doing that as well. Then we have interests.
2:20:33
Interests are we have some constants where we list out the interests and then basically all we have is a list where
2:20:41
which is toggleable. So we can tap on each of the glass chips and see selected
2:20:46
or on press toggle interest. And you see what we're doing is we're storing an array of strings that basically allow
2:20:54
you to basically we can we can tap on each one and we can only have up to six I believe selected. Right? So we need to
2:21:01
have these lib constant files set up. So lib constants
2:21:08
and interests. So of course you can make
2:21:13
this pull from more places. You can have it dynamically in your database. That is completely up to you. Uh but in this
2:21:20
case, we've just got a simple few helpers over here. Minimum interest, maximum interests, and we're saying
2:21:25
minimum you need to like three of these things. Maximum six. Okay. Again, if you
2:21:31
upgrade that part, then your embed vector embeddings will obviously be more dialed in. Uh so yeah, just worth
2:21:39
knowing. Okay, so you see me keep doing that because sometimes this doesn't, you
2:21:44
know, click in well. So I think that's happening because of actually that I know why that's happening. So if we go
2:21:50
to lib constants the reason being is because we don't have a barrel export. So here
2:21:57
I'm also going to have one more for dimensions. Dimensions we're going to use later on. So things like screen
2:22:02
height, width, card width, card spacing, and we use that later on for some swiping help. Okay. Um
2:22:10
this is cool. Uh we got a few. So Meditate says, "Hi Sam, I'm an encoder. Can we make the SQL table in hosting or
2:22:16
run that? Yeah, you can have the back end in whatever you want. Honestly, feel free to to change it up. Robert says,
2:22:22
"Great video so far. I'll watch it later on. I'm in New York 424 here right now." Oh, dude. Crazy, man. Thank you so much
2:22:28
for tuning in so late. Uh, and we appreciate you so much.
2:22:33
Um, so index, let's go ahead and pull these in. So, now that should be good. And then back over to our That should be
2:22:40
okay now. Yep. So we have interest and then photos. So this is where I want to spend a bit more
2:22:47
time now. So photos is the final one. So photos.tsx. So we need to create a use
2:22:53
photo picker. And the main thing that I want to pay attention to here is you see await pick image from library use photo
2:23:00
picker. Right. And then we have this await upload images flow. So we have
2:23:06
quite a lot of things happening after this. Okay. So let's jump into firstly the use photo picker
2:23:14
cuz that's where I basically abstracted all of the complexity for this. So we've got a custom hook. We've got quite a few
2:23:20
custom hooks today. Uh use photo picker. So use photo picker.ts. So let's jump
2:23:27
through this. So step one, expo image picker. We need to install this. So, if we go over to Expo Expo, image picker,
2:23:33
you'll see the image picker. And then go down MPX Expo install image picker. So,
2:23:40
boom. Go back. And now you can see if you're installing, it's worth double checking
2:23:47
what they talk about. And then here, you see we need the plugin. So, photos
2:23:52
permission. This is very important. Go to app.json. Go down to our plugins where we have
2:23:58
this. We're going to add another one. Expo image picker. All right. Hit save. Go back. Now, I've got a couple of
2:24:06
helper functions here. Go away, Java. So, we got pick image, upload photo, and
2:24:12
upload photos is what I'm saying that this hooks will return. Okay. So,
2:24:20
step one. Whoa. I don't know where that came from.
2:24:26
I need to have coffee. That was a powerful yawn. Okay, we're
2:24:31
good. We're good. Okay, so in this case, use photo picker uh max photos six
2:24:37
aspect ratio quality as well. Um but the main thing is is generate upload URL. So
2:24:42
I need to have a files uh function on convex. So this is going to be
2:24:48
responsible for you know setting up the convex side of things. Then we have the pick image callback function. And this
2:24:54
one is going to basically go in launch the image picker allow us to go ahead and select an image. Upload photo is
2:25:01
going to basically go generate an upload URL fetch the URI get the blob and then
2:25:07
basically this will allow us to then go ahead and post to that URL which is the
2:25:13
one that is generated by comx. And then that allows us that's what allows us to go ahead and um get back the storage ID
2:25:21
which is then going to be stored into the users's profile for their image
2:25:27
right because remember we upload the image so basically we say to convex give me an upload URL gives us URL with like
2:25:34
a special token on it we get our image we put it here and we ping it to that URL and now that's uploaded into
2:25:40
effectively like a bucket in convex which gives us back a storage ID now we get our profile file we put the storage
2:25:47
ID inside that that and we create the user that's effectively what's happening okay and then we have the upload photos
2:25:53
which is just a promise all of uploading these photos okay so
2:25:59
API files generate upload right so we need to go to convex and you see we don't have a files
2:26:06
um I have the default IDE theme I'm sure right so
2:26:13
files very simple actually um to be fair. So we have generate upload URL. It's a mutation. All it's doing is
2:26:19
context storage generate upload URL. Query is a get URL. Sorry, it's it's a
2:26:25
get yeah it's a function called get URL. It just goes ahead and gets the URL and we pass in the storage ID. Then we have
2:26:31
get URL imitation and then we have the query for multiple URLs. Okay, so fairly
2:26:38
straightforward. Then that's the photo picker. Now let's head back over to photos.
2:26:43
This is the onboarding step. Now, what we do here is we have a bit of local
2:26:49
state for the photos that we're storing. Um, and then we have that special hook
2:26:54
that allows us to essentially abstract things away from it. So, in this case, when we call this, it will literally
2:26:59
trigger out that, you know, UI that way it pops up. Uh, we have the remove photo which removes it from our local state.
2:27:05
And you see what's happening here is it's only going to go ahead and every time we upload a photo, it's basically
2:27:11
uploading and giving us a storage ID and then it will uh we haven't actually uploaded anything yet by the way. It's
2:27:16
only when we click continue. When we click continue, then it uploads the photo and then we get the photo storage
2:27:22
IDs and that's what we're passing through to the next completion step and then we have complete. Right? So
2:27:28
complete is where the magic is all happening. So going to on boarding
2:27:33
D and then we have complete. Now in complete is where I need to create some
2:27:38
fun stuff. So complete this is that page where it says generating your AI stuff and all this that and it says profile
2:27:45
ready and then it pushes you through. So what's happening here? Well firstly we
2:27:50
need all of those params that was will slowly stacking up. We we need the user we need the color. We need the status
2:27:56
creating generating done error right and it starts off in creating I mean the create profile which is use action you
2:28:02
see this is what we have right so an action is very powerful if we go to users create profile with embedding
2:28:08
these actions are like server actions just how we have them inside of uh react
2:28:15
um xjs we have server actions the effectively similar in in some sense
2:28:22
right can you please how to clone your repo and customize I want to learn using create additional pages. You can feel
2:28:28
free to join zero to full stack hero if you want to jump in and ask me a question like this on a live coaching
2:28:34
call. uh otherwise uh it's hard to do that on call on on a session like now
2:28:40
right what I'd recommend is go back to the beginning watch how I did it from the beginning and then you need to
2:28:46
change as you progress right so create profile is our client side call
2:28:51
and then this is just a posting animation very very simple um use effect
2:28:57
create user profile main thing is here that basically the use effect this is going to load when the page mounts so if
2:29:02
you go down here this loads when the page mounts something and the user changes. So the second we go on this page, the user effect kicks and then
2:29:09
what happens is it says okay creating it gets all of the details. You see we're passing it from the params which are the
2:29:16
the path name and all that stuff. Uh thank you sonic code appreciate you. We get the latitude, longitude and max
2:29:21
distance and then you see we call that action create profile clerk ID name date
2:29:26
of birth gender bio looking for age range interest photos so forth. Then we set the status is done. Haptic success.
2:29:33
The phone vibrates and then we're through. See? And then basically we just call this. So this is whenever you've
2:29:39
got an asynchronous function inside use effect. You create an internal function and you just call it outside. Right?
2:29:46
Then we have the UI that's basically showing those pop-ups, right? So in this case, if we go down here, you can see
2:29:53
look it starts spinning. It says setting up your account while it's creating building your match profile with AI.
2:29:58
That's when the embeddings are happening. and then generating I magic status is creating and then it will if
2:30:06
something goes wrong it'll say oops something went wrong otherwise once it's done you're all set get ready to find
2:30:11
your perfect match and then after that we will have a then what will happen is
2:30:17
this is where it gets very clever then what happens is if you remember clearly
2:30:22
uh firstly we can fix this by having your post yeah so if we go back to layout so imagine this will update the
2:30:30
user's profile which in turn causes remember when we go back to the layout
2:30:36
it then causes this to refresh. So now the user has a profile which means
2:30:42
they're no longer gated behind the protected g gate. So now they bypass this part and then they go into this
2:30:49
part. You see right? So um really really
2:30:54
nice kind of flow now. So let's do a refresh and let's run through it. Okay.
2:30:59
And what I will show you in the side as well is the actual database in action as
2:31:05
we do it. We're moving pretty good on speed as well. To be fair, I feel like we're very
2:31:11
nicely explaining things, getting really deep into it. So, um, let's keep that on that side. I just
2:31:18
want to show you this. Yeah. So, uh, data
2:31:23
users daily pics. Someone's created a daily pick
2:31:31
users. Oh no, this is not I was going to say I
2:31:36
was so confused. Yeah, we need to go to YouTube. I was like, oh no, someone's used the key. Uh, go to users. All
2:31:42
right, I was genuinely impressed for a sec. Uh, if we go Sunny Sanger. Okay.
2:31:47
Uh, Benj birthday. Let's just say it's fine. I am a man. I'm looking for a woman. And then let's go ahead and
2:31:53
continue. Enable location. Yes, I'm in San Fran. I'm in Dubai. But yeah, I say
2:32:00
uh I love coding. It's fun, right? Continue.
2:32:06
Your interest. You see these t these aren't loaded correctly yet because we haven't built a development build, but
2:32:11
right now it's fine. It's still rendering out. Okay. So now we have this down. What I would then do is uh click
2:32:19
on complete profile. And what I want you to see is what happens next. So, complete profile. Oh, sorry, not this
2:32:25
one. We have to do one more picture. So, let's add a photo. Let's add this photo. Let's add the
2:32:33
second one maybe.
2:32:38
And then let's go ahead and click on continue. And now the magic's happened. So, this is uploading those photos. Now,
2:32:44
it's generating the embeddings. And bam. You see, now we're logged in. It bypassed it. Got to the next step. And
2:32:50
if we look over here, boom, we age 25, age range, bio, user, date of birth,
2:32:56
embeddings. Look at that. We have vector embeddings. That is a AI representation of me. Okay. And then we have man,
2:33:02
interest, long location, looking for max distance, photos, and these are photo
2:33:08
IDs. You see updated that. Awesome stuff. Right now, if we go into logs,
2:33:13
you should be able to see, look, ah, it called all this. Look, Sunny sanker deployed. Then it generated the upload URLs of both those images, created the
2:33:20
profile, created the profile with the embedding, and it got the user. Awesome stuff. Now, if we go into files, you'll
2:33:26
see the two files, right? So, now we've got these two files. And if we look at these, you can see if you just hover
2:33:32
over it, you'll see that that's the user's profiles. And these image IDs correspond and are linked to that part,
2:33:39
right? So, uh the the users data. So, you see how it works, right? And all of
2:33:44
that is real time. Super nice. Okay, so now we're in here, we proceed to the tabs. Okay, so now we start building out
2:33:52
our tabs. So step one with the tabs, we have our layout. Now for the tabs, and
2:33:59
this is where I'll get glass working for the tabs, we use something called native tabs, right? And this is going to be
2:34:05
exposed. So I'm actually going to pop ours in here. So if you look at the code, I've copied them in the new code
2:34:12
that I popped in on our side. So, uh, Big Sleep says, "Hi, Sunny. I'm a beginner. How did you get your phone
2:34:18
screen running on your Mac? Is it an hour simulator with Expo?" Yes, it's an iOS simulator with Expo. Uh, to set up,
2:34:23
you simply do PMP start once you go ahead and, uh, get the app running. And
2:34:29
then once you're in once you're done with that, press question mark. And you can see when you're running your app, it
2:34:34
will will give you these options. We press I to open up an iOS simulator. And you see it found it. It it will
2:34:41
literally start installing it. If you don't have an iOS simulator, you need to download Xcode, set your Xcode up, do
2:34:47
the profile steps I mentioned earlier, and you can do it that way. Or Android, you open, you download Android Studio,
2:34:53
set up your simulator there, and then you can go ahead and run it on the simulator by doing the same command
2:34:59
except that one is going to be A for Android or shift A to select a specific Android emulator.
2:35:05
Or you can even use your phone by pressing C and you can see a QR code and you scan your phone. It'll download the
2:35:11
Expo Go app and it'll work. This all works for Expo Go. Once we get to Expo
2:35:16
the development build, that's when we're going to need to do a development build, which is a little bit more complex.
2:35:22
Okay, it's not hard, but it's just it's a bit more of a step, right? Um, okay.
2:35:28
So, this part now we have um
2:35:34
nice. Yeah, here we have supports the glass pack. So, and by the way guys, if you do find this is like, you know,
2:35:40
really tricky and you're not sure like really do please like join our community at 04. So, paparact.com/course.
2:35:47
We literally go over this stuff inside the course and community. And also, we have a limited time situation right now
2:35:52
where if you join in, you will be one of the only people to benefit from this because once we do this and we open the
2:35:59
new community, we're going to close doors on uh everything old essentially. Um, and we're going to give every single
2:36:05
person who was a member of zero to full stack zero to full stack hero 50% off
2:36:10
for life in the new community which is going to be an affordable community which is going to be AI first so we can
2:36:16
basically teach you how to be the ultimate nextG developer. So make sure you go check it out puppy.com/course
2:36:22
join in so you can grab that 50% off when we launch the new community. Uh, and it's going to be super affordable.
2:36:28
Right. How do you want to put this like this? Right. Yes. here on a Mac. If you're going to do it like this, then
2:36:34
you have to install Xcode, set things up, and then you should get your uh simulator. So, we have native tabs.
2:36:40
These come from Expo Routers, unstable native tabs. And then you have dynamic colors. In this case, we have the
2:36:46
dynamic colors. And then we got these labels, these trigger labels. Okay. Now,
2:36:52
I want to mention so here I have not installed this correctly yet fully. So,
2:36:59
native tabs we need to install. So, Expo router. Oops.
2:37:04
Expo Expo. Expo Router. You're absolutely welcome, dude. Native Tab. GC. 4 days ago. Look at that, guys. 4
2:37:11
days ago it was released and your boy already built a whole built a whole app around it. So, this is what we're trying
2:37:17
to do. Okay. SDK 55 or later. We have these right less and so forth. So,
2:37:24
actually interesting. Right now, if we go to package JSON
2:37:31
Expo 54. Okay. Right. So, I'm going to show you something pretty cool right now. So, we're using 54 right now. Expo
2:37:39
SDK 54. Should have checked that in the beginning, but I'm going to show you how we can upgrade it right now on live.
2:37:46
Yeah, on the live stream right now by using the skill. So, we're on SDK 54,
2:37:51
but I want to obviously be on 55. So naturally, you can follow an upgrade guide and so forth, but I'm going to
2:37:58
show you how you can use use an AI to do it. So in this case, I'm going to say I need to upgrade
2:38:03
to SDK 55. Expo SDK 55 and I'm going to
2:38:09
say forward slashupgrading expo skill. Remember we installed that earlier. Hit
2:38:14
enter. And now watch how cool this is. Right. So what we're going to do is I'm going to press command E to basically
2:38:20
open up our agent view. And then you can see like I'll help you upgrade to X455. Let me first check your current project
2:38:27
configuration to see what we're working with. And you can see it's going to check a bunch of stuff. And I can see
2:38:32
you're currently on Expo SDK 54. It's analyzing everything. Uh Expo install
2:38:37
latest. There you go. Starting to install things. I've got mine on run everything. Uh Ben says, "Hello, Sunny.
2:38:43
Happy New Year. Awesome stuff, dude. Happy New Year to you. Been a while since I followed your builds. You're among the best devs I've ever come
2:38:49
across and you improve my life." Jay, screenshot that. Thank you so much, Ben Renie. I appreciate you so much, dude.
2:38:55
Uh, and a massive happy new year to you as well. It's so honestly, you guys are too kind. I really, really appreciate
2:39:00
you. So, you can see Expo at latest. Good. Look, it says Expo has now been
2:39:07
upgraded to 55. Expo install fix. Now, it says the dependencies are up to date.
2:39:12
Expo Doctor starts running. And this is pretty cool that 17 checks, one check failed.
2:39:24
Oh, okay. So, it did I'm going say use PMPM.
2:39:36
PMPM. Yeah, cuz I have a feeling I do command B, it doubled down on PMP. No,
2:39:43
that's okay. Oh, interesting. Okay, let's do it thing.
2:39:50
Let me check. And it starts doing a bit of debugging right now. Package tools tools 55 is in release. Okay. So 55 is
2:39:58
in beta, I believe. So what we can do is expo uh SDK 55
2:40:06
beta. Ah, that's why. Okay. So we can do
2:40:11
upgrade skills. It's in the beta. So, if we go down
2:40:17
here, we can say it's in beta. I want it.
2:40:23
Uh there there is a command somewhere. Uh here we have it. So,
2:40:37
expo next. Ah, next. That's what we should have done. Not latest. Yep. See,
2:40:45
but this is literally like it's very powerful, guys. And what is doing it so well is because the expo team created
2:40:51
those expo skills and all we did in the beginning when we prompted is we said, "Yeah, just include that skill." Which,
2:40:56
by the way, I didn't need to do. I'm just making sure that it does pick it up by just doing for/upgrading skill expo.
2:41:02
It's kind of a habit I do. But if you don't do that, it will basically have a name and description from that skill
2:41:09
like here. and it'll say, "Okay, is this current question related to that? If so, pull the skill in," which is really
2:41:15
nice. Okay. And now it's installed it. It's going to run expo install fix and
2:41:20
it will start running through my app and uh checking all the different fixes. So, we'll let that do its thing. Super nice
2:41:27
though. Like, you're seeing this live. I actually didn't plan on showing this live uh which but I think it's awesome
2:41:32
for you guys to see like the skills are in inside of cursor and just in general in the AI agent space is a huge thing
2:41:40
guys like you need to understand if you're not learning about skills uh understanding how sub agents work. This
2:41:46
stuff will set you apart like it'll really make you a much better developer provided you don't just blindly follow
2:41:51
it. So understand what it does and once you do that guys it's it's so powerful.
2:41:57
It's really like it's really something else. All right, mid pump that loader back on.
2:42:02
There we go. So, remove deprecated packages. And now it's going to add a couple of new export or session and
2:42:10
remove vector icons. So, it's just basically just handling a bunch of stuff behind the scenes, removing deprecated
2:42:15
packages. And you see, look, it even got rid of that error. Look at that. It got rid of
2:42:21
that error. So, it's now working. Absolutely awesome, right?
2:42:27
Now let's see. Let me fix the export all session version to match SDK 55 and then
2:42:33
run the diagnostics.
2:42:38
By the way, even sometimes if it says MPX, it's still using my PMP under the hood. So it's clever enough to know
2:42:45
that, right? MPX expport doctor. Awesome. Yeah, it is really awesome.
2:42:51
Right. Let that do export constants required. See I see is still required but I so I need to add it back. I found
2:42:58
several files using export that need to be migrated. So it's literally going through now and making the changes. So
2:43:04
it's reading and then you see like you can even click on review and kind of run through
2:43:10
afterward it's done. It'll start showing you different changes it did. I see the code base sensate favor migration. Oops.
2:43:18
Ignore that. That's fine for now.
2:43:33
So it's clearing the cache and it's installing again. Here one is duplicate in favor of expos
2:43:40
the migration would be significant since expo symbols uses SF symbols. I mean that's fine but in this case it added it
2:43:47
back to keep the app working. So you see like it's worth reading this. Yeah, because if this was me, I would say no,
2:43:53
no, it's fine. Just use the SF symbols instead. Um, and then proceed with it. So, in this case, we can just say we
2:43:58
could even do that. We just say use
2:44:04
SF symbols and refactor as needed, right? And also, I just want to
2:44:10
highlight, look at this, guys. It did it. It actually upgraded in a whole SDK version up, which by the way can be
2:44:17
quite a painful process. Yeah. So here summary of changes the upgraded packages expo 54 to 55 export router it handled
2:44:24
everything uh react uh react native react native and rean animated work list
2:44:30
it done all the housekeeping and the fixes as well added export or session as well which required a ped dependency for
2:44:37
clerk so you see those two things are pretty much good um and yeah and now
2:44:42
look it's refactoring the codebase to use the SF symbol with the expo symbols uh which is pretty cool right and again
2:44:48
It's created a to-do list and it's starting to go through it. So, while it's doing that, we can kind of, you
2:44:54
know, run through and proceed. Um, to be fair, my only thing is though, I don't
2:45:00
want to do this because I feel like it might change a lot of work that we're going to do moving forward. So, what I'm
2:45:05
going to do here is go back
2:45:10
and just say stop. And basically what that would have done, let me say stop here. Yeah. So that would have reverted
2:45:19
at that point. So we're good here. We're good here. Yeah. So what we're going to do now is we changed a lot of things. So
2:45:26
I'm going to do command E. Go back. Command I. Hide this. Command B. Command J.
2:45:31
I'm going to cut my terminal. So I'm going to actually we don't even cut it. So it's running. I'm actually I'm going
2:45:37
to cut it. Cut it. PMPM start. Do a fresh slate. Okay. Now you can see we
2:45:44
got a little error. Oh, no we didn't. We're good now. Okay. And then we do open on iOS. I It says Expo 55 is
2:45:52
recommended. It's using it. Install the recommended Expo version. Yes. Fetching. Downloading Expo Go app,
2:45:59
which is kind of crazy, guys. It did all that on its own, you know. So, let's let that do its thing. Boom.
2:46:08
Come on, J.
2:46:16
Awesome stuff. Building out the JavaScript bundle.
2:46:23
And now we should have our app load up in a moment.
2:46:30
So, hit a refresh. New update available.
2:46:40
Okay. So likely we hit this page and then we're
2:46:46
not seeing the result. So what I believe we could maybe do here is
2:46:54
perhaps let's do command J. I just want to check something loaded. Okay.
2:47:01
And then native tabs. Native tabs discover. So in this case where we have
2:47:07
our layout we don't actually have these pages. So you see layout tabs but we
2:47:12
have an index I guess start page we should be seeing that. Okay.
2:47:19
So what we can do here is press home.
2:47:24
Interesting. So open on iOS again. Let's try again. Hit a refresh.
2:47:31
Okay. So, we're in a we're on a page somewhere and I can't figure out exactly
2:47:36
where. So, we we're going to debug it ourselves and figure out what the hell's going on. U but yeah, just know that was
2:47:42
pretty cool. That actually worked really nice, right? So, in this case, Applej, I just want to check something newboard
2:47:48
name community payer. It didn't delete our old stuff. Nope, we're still good.
2:47:55
I'm going to commit everything just for a second. Obviously, you should be checking that
2:48:01
just FYI. Um, I'm just doing it for my own benefit here. Uh, but in the layout
2:48:08
tabs, I don't think native tabs work on Expo Go. Yes, I think you're right. I think you're actually right. That's
2:48:13
where I stopped last time. So,
2:48:28
okay. So, what I'm going to do is I'm going to do a custom development build now. So, uh
2:48:38
yeah. So, what we're going to do is we're going to do a custom development build. So, I you can do this in a couple of ways. Now, uh, EAS one way I'm going
2:48:45
to I've set it up on my system so we can have it effectively just run the entire build process. So, once you have
2:48:52
everything set up on your system, it's you just run effectively. Uh, I always forget the command. Um, let me grab it
2:48:59
quickly. Run iOS.
2:49:11
So it's actually this MPX expo run and I want to do iOS build. So I'm mainly
2:49:16
building on the iOS side. So you can see MPX expo run iOS and chances are you
2:49:21
will fail at this point. So you need to set that up on your machine. Okay. So set that up on your machine and and then
2:49:27
you'll have to go through a few things. There is teething issues there. It's fine. Just take your time with it. Again, I recommend Warp is a pretty good
2:49:34
browser um terminal. You can actually use AI to help debug inside the
2:49:40
terminal. uh with those kind of problems, which helps a ton by the way. Uh so go ahead and give that a try. Now
2:49:48
here um let that do its thing. So installing cocoa pods
2:49:56
and then once that's done again also this will only work if you have Apple developer account. So, if you don't have
2:50:02
an Apple developer account, I suggest you switch to Android Studio now and start uh testing on an Android device or
2:50:09
uh get uh Apple Developer uh $99, I think, and then um if you're going to
2:50:15
build an app anyway and you expect to go live, then you're going to need it uh regardless. You have to have the Apple
2:50:20
developer account if you're going to release to iOS. Um so, it's a must. So, anyone who's seriously building, then of
2:50:26
course you need it. Um so, we can go we'll come back to that in a moment then. So while that's happening, let's
2:50:32
sort out the index page, right? So the index page is going to be the discover screen effectively. So we're going to
2:50:38
say this is discover screen, but I also want to show you those tabs. So here we have the layout. Oh, where
2:50:46
did I add that?
2:50:51
Oh, it's Oh, no. Um
2:51:03
yeah yeah yeah. Oh no. Maybe I screwed up actually. Uh
2:51:10
okay. So don't I put in the wrong place. Ah I put it here. We don't want it here guys. That's why I screwed up. This
2:51:18
should stay as the stack screens. Yeah it's inside of here. the layout I put in
2:51:25
the wrong place. Inside the tabs layout was the native tabs. Okay. So the code
2:51:30
is in the the GitHub. So don't do what I just did. Right. So that's why it wasn't showing.
2:51:36
So the layout. Yes. Because obviously we needed that on boarding protected flow.
2:51:42
And now we should see something besides that if we did do it right. Well, but I mean it's still building. My computer is
2:51:50
now on steroids mode as you can imagine. So right now it's building heavily
2:51:56
because I'm streaming. I'm doing a bunch. And you can see it's the CPU is going to obviously go pretty high. So
2:52:01
that tends to put your computer through a bunch which is why EAS can help out a lot. And if you do use ES, I highly
2:52:06
recommend you use Orbit. So download something called Orbit. It's nice little uh extension or app on on your Mac or
2:52:13
Windows must have a version. but basically allows you to easily select a build, a development build, and install
2:52:18
it to a simulator. Really handy in my opinion. Okay, so
2:52:27
so that's building still and we're going to have to switch from here. So we're going to have to
2:52:33
eventually press S to switch to a development build once this is done. Right, the first build, by the way, will
2:52:39
take a little bit of time. The second, third, fourth build are much quicker.
2:52:44
Okay, I kind of need that screen to show you the next bit. Uh, but in the meantime,
2:52:50
actually what I can do is we can start preparing things on the other sides. So, in comx. Oh, actually it worked anyway.
2:52:56
Okay, so you see open in AI dating app YouTube. Yes, that means that the expo development build was completed. So,
2:53:03
command J go down and you can see, hey, look at that. Nice. Open debugger to view warnings. That's fine. We can check
2:53:09
it out after. But you see how it built and it went ahead and shoved us over there. Now if I go ahead and see. So
2:53:15
I've got some issues here which is fine. Uh CS switch to development build. Now
2:53:21
using development build if I press R. Now I'm refreshing from a development build. So you only now need to rebuild
2:53:28
if you add a native library. Okay. So just worth knowing that now. So let's go
2:53:35
ahead and create an account now. So, so sign up. Let's find all that. Sign
2:53:44
up. Let's do sunny. And you see how now we've got this nicer outline now that we didn't have before
2:53:50
atgmail.com. Let's just do
2:53:56
Jay. Can you give me the OTP, please?
2:54:02
So, once that's done, Jay will give me the OTP. And in the meantime, we can
2:54:07
start proceeding with a few other bits and bobs. So, um,
2:54:15
convex is what I wanted to do. So, in convex,
2:54:21
what we can do is we have matches, messages. Oh, so you gave it to me already. So, let's do we'll come back to
2:54:26
that. 339. Okay. Verify. Now, we've created a new
2:54:33
account. We should go through the on boarding flow. What's your name, Sunny?
2:54:41
Let's go ahead and create. What's your birthday? Boom.
2:54:46
A man. Boom. Location.
2:54:52
Yes. I love to code with AI.
2:55:00
And then one, two, three, four, five, six. Oh, you see that? Yeah.
2:55:07
And by the way, there'll be a slight caching issue. So, what you'll find is is if I was to I I kind of I want to get
2:55:15
to the next screen, but so right now, you see, look, we've got
2:55:20
glass icons. Can you see that? So, that is actually a glass icon, right? And you'll notice that that will start to
2:55:26
come up more now. So, look, now we've got the glass icons come through. You see that? And even so now you'll see the
2:55:32
glass icons, right? You see how it slightly moves around a bit. So just know that when you're doing this like
2:55:38
you see like now we've got the glass field here. So that you can have caching situations sometimes where it can cache a node version and so forth. So I love
2:55:46
to code with AI continue. Yeah. So it's just a cache version.
2:55:52
That's all it is. So eventually you can do a hard refresh and clear cache on your device. I'm not going to bother
2:55:58
doing it all now, but that's how you get around that my info. Let's add this one for Elon or Elon in my account.
2:56:05
Uploading. And I should have added a safe area bottom bit. But you see, generate magic. You're all set. And bam. Now we're through. And this is perfect.
2:56:13
Look at that. Hey, we got glass. Liquid glass. Nice. That's amazing. Right.
2:56:19
There we go. Okay, now we can run. So, we have the discover screen, right? And if we have the sign out button, if I
2:56:25
click sign out, that will do a sign out from our clerk. So, we're not going to do that. Now, if I hit a refresh, so if
2:56:33
I do a R, you see? Boom. We go over here. And now,
2:56:38
close that off. Boom. We're here. Okay. So, a couple of things now. Let's do cuz
2:56:43
we've got quite a lot to do. We're two. We're nearly 3 hours in. So, this next hour is going to be more locked in
2:56:51
so that we don't, you know, drag for like 6 hours. Uh, and I'm going to change the music a bit to be a bit more
2:56:57
high energy because I have never yawned. I don't I think I have yawn, but I've never I don't usually yawn on live
2:57:03
stream. So, let's pick Jay's music so you guys can give Jay a shout out for this one.
2:57:09
Okay, so discover screen. Let's go and do that. So, tabs index is the homepage.
2:57:15
So, a couple of things now. 3 hours deep. Yeah.
2:57:20
So, we got the cut. So, this I'm just going to explain as we do it now. So, we need a few things to get started off.
2:57:28
Okay. Yeah. So, number one, we need the app
2:57:34
theme. Number two, we need to create a custom hook called use current user. Number three, expo router. Number four,
2:57:40
use query. But we need to create the swipes back end. Use mutation. We can pull from convex react but we need to
2:57:46
create the swipes convex functions. Use state pull in the doc is from convex
2:57:53
again ID is from convex and this is going to basically be for filtering out locally swiped profiles right cuz we're
2:57:59
going to be doing optimistic updates. Now this is the first step we're going to do
2:58:05
is create this use current user hook. This one is more of a refactoring step to help us not repeat the same code over
2:58:12
and over and over again. So inside a hooks
2:58:18
over here, we're going to create a use current user.ts. And all this is doing is it's just a a custom hook wrapping
2:58:25
the use user hook. But basically, we get the user and then we also map them to their user inside the database because
2:58:33
remember a clerk user ID is different to the convex user ID but they're the same person. So we kind of created this to
2:58:40
have this synchronization behavior. We got the current user and then we also have the uh clerk user. So
2:58:47
boom and then the API swipes. So in this case we need to go to convex and create the
2:58:53
swipes. All right. So this means the functions all that kind of stuff. So
2:58:58
swipes let's go into this swipes.ts. So let's jump in and have a look. So are
2:59:05
users compatible? Get distance between users. Those two we need to create. Now number one create swipe and check match
2:59:12
helper function to create a swipe and check for mutual match used for both create swipe and create swipe internal to avoid code duplication. So this takes
2:59:19
the swiper ID and the swiped ID. So, the person you swiped on plus your ID and then the action which is like and
2:59:25
reject. Jay, oh, I know this song. This is when we bought the Teslas. Um, and it
2:59:31
returns matched and the match ID itself. Okay. So, what happens is it creates a swipe. So, basically the second I click
2:59:37
on uh a swipe, we're referring to as a like, right? So, once we do that, we
2:59:43
have a swipe in the database of the person who swiped on the person who swiped the action and the created app.
2:59:49
Right? So if the action is a like then what we're doing is we're checking if there's a match. So did the other person
2:59:56
swipe on me? Right? And if that's the case then what we do is we run a we
3:00:01
create the match on the back end. So that way we do it at the time where the second person created the the matching
3:00:08
like okay so this is where we're going to create the match between user one and user two and we return match true. We
3:00:15
can we've got helper functions for getting a specific swipe, creating swipes and so forth. Uh getting the
3:00:22
likes that you've received, get users who liked you that you haven't swiped on yet. It's like a helper function. Feed
3:00:28
batch. See, get users to show in the sweet uh swipe feed. We only want five users at a time. We don't want a million
3:00:33
users if there's a million users on the app, right? get the swipe feed basically is it's going ahead and just going into
3:00:40
the database making sure that we don't include the users that we already swiped on and then it will go ahead and check
3:00:47
through. So, and we use a set to basically efficiently do that. So, if the sets can't have duplicate IDs,
3:00:53
that's why we're doing it. Then we have candidates who basically everyone who we haven't swiped on um and that basically
3:01:01
saves us a bit of you know repeated stuff. We skip ourself. We skipped already users the swipe users and then
3:01:07
we check is the users compatible. So remember that double check that I'm doing. So I'm making sure are we
3:01:13
compatible with what you're looking for. Are you looking for the same gender that I'm looking for as in like or are we
3:01:18
matching on that preference? Is the age matching? Are we in the same distance preference? If so, yeah, if it's not,
3:01:26
then it'll stop there. Otherwise, it'll proceed onto the distance, right? Are we in a good distance and so forth? So this
3:01:32
one was the user basically preferences but this is the actual distance one and then it sorts them by the distance. So
3:01:38
it will show the first person in that card stack of who is closest to you and
3:01:44
then it'll be the next person who's furthest away from you according to those things and it keeps only the closest candidates. Okay. And then we
3:01:51
resolve the photos only for the candidates that were returning. And you see now we've got this efficiency behind
3:01:56
it. We've got this create swipe uh internal. This is useful like when we're calculating daily picks for example and
3:02:03
yeah so that's the swipes and then let's do the matches as well while we're here. So matches.ts we need to create the
3:02:10
compatibility layers as well afterwards. So vector search is basically an ID and a score. So we're going to keep that for
3:02:17
later. Get matches. So get all matches for user helper function. It'll probably be called down below. What we're doing
3:02:23
is we're effectively doing a match between two people. So, get all matches for user is Oh, we've already done that
3:02:30
down here. So, that's basically where we take one person and we compare them to a second person.
3:02:36
No, get all the matches for user. Um,
3:02:42
get the users profile uh for each match. Okay. And then the main part that I'm
3:02:48
checking is check match. We already know how it works. Create match. We know how it works. Update match explanation. Yes.
3:02:53
Um, get match internal. or get matches. Get match with both user profiles.
3:03:00
That's just getting the pictures for the match. Generate match explanation. That's when we can do it afterwards.
3:03:08
Mainly the thing I'm interested in is daily picks. We can come to afterwards.
3:03:13
It's basically just going to go ahead and we've got a bit of a nice bit of code here which is going to go ahead and pick three people who are similar most
3:03:21
similar to you. save daily pics internal function update
3:03:26
pick status there's a lot that we've done here that will help us out but I'm trying to find the main generate the
3:03:32
daily pics also so when we generate the daily pics right uh you can see the logic above for how we effectively go
3:03:39
and save the daily pics and all that stuff but the main thing that I wanted to mention was here the AI explanation
3:03:45
so you know for example how it says you and Sarah for example both match on
3:03:51
these interests for example so What we're doing is we get the person say user one is this person, user two is
3:03:57
this person, right? A brief match inside you see you two seem like a great a great match blah blah blah and so forth,
3:04:04
right? And then we're using we're using a generate chat completion call which is what yeah we did use it in the end,
3:04:09
right? So I need to create that and uh yeah that's how we effectively
3:04:14
make that. So then we in the AI matching section we have it all ready to go. My
3:04:21
main thing I want to focus on is not this. I want to focus on the we need to create these first and
3:04:27
the open AI lib compatible things. So in this case one we need
3:04:37
so in convex we have a lib openai.ts
3:04:43
we have it. Oh actually I mean this is repeated from similar to the other bit we actually had this already. I think it
3:04:48
was here. open it. I just put it outside here.
3:04:54
So So somewhere it's going to break, but it's fine. It should be over here anyway. So
3:05:01
yep, we need to fix our on boarding for that bit cuz it should be there. And then lib compatibility. So we also have
3:05:09
a compat compatibility. TS and this one is effectively we need to create a distance helper. But are users
3:05:15
compatible? So here check if users are compatible based on their preferences performs birectional checks of gender
3:05:20
preferences age and distance and it's way cheaper to do vectors vector embedding checks as opposed to literally
3:05:26
checking and running LLM checks and all that kind of stuff. So if user one is looking for the same user two gender so
3:05:32
basically make sure that the the genders are matching make sure that the age preferences is within range and make
3:05:38
sure the distances are within range. Right? That means they're compatible. Okay. Then we have a distance check. So
3:05:45
distance check calculate distance miles. So we take latitude longitude we use the
3:05:50
habsian formula to basically determine is the length between one coordinate and another coordinate greater than the
3:05:57
preference. Right? So that's effectively what we do here. And don't worry you don't need to be a maths wiz. Right? AI
3:06:03
can write this for you. Very simple like uh and I've done this a couple of times and you can either use a library or
3:06:10
literally you can just get to do it for you. But basically just is this very simple formula that it can just spit out and basically it takes two latitude
3:06:16
longitudes and it'll give you the rough miles between. So you can use that when you're doing preference checks and so forth. So is within distance takes us
3:06:24
location the target location the max distance and it will basically say okay true or false. Are we in range or not?
3:06:31
Right now going back over we can restart the typical server to fix
3:06:38
some of those things. Go back over here the tabs. Where are we
3:06:44
at? We're on the start page. Yep. So that gave us back the API. The swipes
3:06:50
create swipes ability. Also at the on boarding something in here would have broke. The complete would have broke. So
3:06:57
we use create create profile with embedding. This one would have broke. Lib open AI. Yeah.
3:07:06
So heading back. We're now on the index page. We need to have yeah the next bit
3:07:13
now. So we're now in the discover screen. So we
3:07:18
got the profile. We have everything ready at the top to be able to swipe and create swipes and all that kind of stuff. Uh we have the current profile.
3:07:26
So next step is what happens when you press like or reject. So we're going to
3:07:31
create that helper now. So handle action. The action is either either a like or a reject. And here's what we do.
3:07:38
We set the swipe optimistically remove profiles from the feed immediately. So what we do is although convex is pretty
3:07:44
much real time or is real time it's very fast. There is a slight delay between when you tap versus when it changes. So
3:07:52
even though that is really fast it's still noticeable and I didn't want that. So I'm I created optimistic updates
3:07:58
which means it will immediately do it state side and then if anything goes wrong then it will revert. Right? So
3:08:04
that's why whenever you see optimistic updates that's why it is fire mutation in the background don't await otherwise
3:08:10
it will block. So we create the swipe then it will go ahead and show a match
3:08:15
modal afterwards because when you create a swipe it will go ahead and actually give you so we go into create swipe it
3:08:22
will handle the match. Oh look create swipe and check match. So result will contain if there was a match or not. So
3:08:27
if it was a match then we show a modal and that modal is going to be that wa you guys matched okay
3:08:35
if anything went wrong we fail uh we basically will delete the record as well
3:08:41
okay and we revert the optimistic updates. So after that we handle a like
3:08:47
and handle a reject is just a simple wrapper function. Some people like doing this pattern some people don't. It's up
3:08:52
to you. We have a handle send message. So
3:08:59
this one is for when we want to go ahead and send a message to someone, right? That's going to be wrong for now because
3:09:05
we haven't got the page. That's all it is. And keep swiping. So these are when it pops up with you've matched someone.
3:09:11
In this case, it will say, do you want to send a message or do you want to keep swiping? And again, all of this could actually the whole model could be
3:09:17
offloaded into a different place. By the way, then we have a few loading states. So
3:09:23
here we have a loading screen. So if we're still loading from convex protective routes, right? If we're
3:09:30
loading the swipe feed uh and then safe area view and empty state. Empty state
3:09:36
is important because when we don't have a profile, when we don't have messages, when we don't have a few things like that, that's when we need to render
3:09:42
that. So I basically created these dummy not dummy components, but these reusable helper components we can use to help
3:09:48
with that. So in components inside of UI, we have two of them. So, uh, we have
3:09:54
empty state. So, if I go into commands UI, we have empty state and we have
3:10:00
loading screen. So, I'm going to add these in right now. Empty state.
3:10:06
This one is uh way simpler than it looks. Just takes icon title, subtitle,
3:10:11
icon color, and it just renders out an empty state. It just says like literally no matches. Come back later. Uh, you can
3:10:17
you can customize it. Right. Then we have the loading screen.
3:10:23
which is over here. Boom. And loading screen just takes a message loading for example and just shows an activity
3:10:28
indicator with the loading message. So super simple reusable components. Cool.
3:10:34
Now we can import these like so. And you see we can use the empty state customizing it for different use cases.
3:10:40
No messages yet, no matches yet, and so forth. Okay. Now after that's done,
3:10:48
we render out the UI. So the UI is going to be the big chunk. It's going to be
3:10:54
this. We have the animated from React Native animated. We have fade in, fade out.
3:11:00
Styles I'll add in in a moment. Floating actions are the like and reject buttons and the match modal which we'll create.
3:11:06
Styles are super simple. We're just going to go ahead and get rid of these and we're going to pop in some simple styles. Right now the main thing is the
3:11:13
profile view. This is where we see the actual profile on the page that we can swipe and do everything with. The
3:11:19
flowing actions are the ones, the like button and the reject button. And then the match model is, hey, you made a
3:11:25
match. So very simply, we can do the match model first because it's actually quite an easy one to do. So inside a
3:11:31
components, we're going to create a matches
3:11:38
component with an index.ts. We have two files that we need to build. Daily pick card and match model. So the match model
3:11:45
is going to be that pop-up model. So we got a lot of things from React Native reanimated because we want to have that
3:11:51
nice like b kind of you know animation. So this takes a few things visible current user matched on send and on keep
3:11:58
swiping right and you could refactor it. So all the custom logic is happening here really. Okay. So if it's visible it
3:12:06
will go ahead and vibrate the phone and then it'll have this like kind of animation going on right? Otherwise it
3:12:14
will it'll just disappear slowly. Uh we've got some styles happening going
3:12:20
on over here. We've got the current user's image. Again, right now we've just got a fallback as well in case the user doesn't have an image. But here
3:12:26
we've got the modal transparent animation type none because we're handling this ourself. Right. So this we
3:12:33
can change to the apostrophe. That's fine. It's match. So these two functions onset message and
3:12:41
on keep swiping we pass in. So really this is a dumb component. It doesn't do anything besides handle the animation
3:12:46
part. Okay. And presenting how it looks. Daily pick card is going to be the card
3:12:52
that we talked about before. So remember I showed you in the beginning it was actually the daily pick sort of uh card
3:13:00
element to it. So what that one would have is based on your daily pics. So let we actually again it's a dumb ele um
3:13:07
it's a dumb component because the higher component the parent would have had the would have fetched all of your daily
3:13:13
pics passed in everything as a prop here and then it'll render it out. So this again is just preparing some stuff and
3:13:19
then this is just handling the photo tap you tapping the left of the photo the right photo and going through it. Okay,
3:13:26
got some UI which is the hero and this is going to be for the daily pics which is effectively
3:13:32
this one these daily pics these cards.
3:13:38
Okay, photo tap zones we need to create and the photo indicators. So components UI those are effectively these. So if I
3:13:44
tap on this side of the screen it will go back a photo. If I go on this type of the screen it'll go forward a photo and
3:13:50
it will loop around to the beginning of the photos. So components UI,
3:13:56
we've got the two which was if we could just go to components UI, we can actually see them in the index here. We
3:14:02
got the photo indicators and the photo tap zones. And we might as well do photo carousel while we're here. So photo
3:14:09
carousel is number one.
3:14:14
For photo carousel, we have these two which we need to create. And this takes a couple of props. photos height on
3:14:20
photo change show indicators grading children indicator. You see the pattern here we pass in props from above and do
3:14:26
the hard work above right and then we we can customize this on photo change. What happens
3:14:32
handle tap if you tap on the left side or the right side it just sets the index of the new image to show. Okay. So this
3:14:40
is effectively what's happening now. And then we have the photo indicators which are basically the top part. So
3:14:46
this is the photo indicators at the top.
3:14:53
You see photo indicators, count, current index, and style. So based on the count, it'll render out like, you know, six of
3:14:59
them or five of them and so forth. And then it'll just go and cycle through which one's active current index. Yeah.
3:15:07
And then we have the photo tap zones. So the photo tap zones is literally the
3:15:13
final part which is invisible tap zones for photo navigation. Left half goes to the
3:15:18
previous, right half goes to the next. Just two touchable opacities. Use flex
3:15:24
one on each side and make sure each one has flex one. And then basically it'll perfectly half their usage.
3:15:32
Okay. Now the only reason why that's freaking out is because this isn't refreshed.
3:15:38
And there you go. So heading back over to matches now or
3:15:43
daily break. No photographs. Oh no. Yeah. Floating actions. Match modal. We
3:15:48
can pull that in now. And the match mod's good. And the match mod's working. So floating actions is next. These are
3:15:54
the two floating buttons when you're on the card screen. These two floating one,
3:15:59
floating two. Okay. So floating actions. Let's create these ones. So
3:16:12
So floating actions is actually inside of
3:16:18
profile. So this is going to be components profile
3:16:26
and then we have an index.ts here. We have a bunch of things we need inside
3:16:32
here. the photo item. There's one. We just want for now the floating actions.
3:16:40
Okay. So, for the floating actions,
3:16:48
floating actions. TSX, we have two things. On reject, on like, and the disabled state. So, think about it.
3:16:54
You're just rendering from the top what it does. You're passing in the onreject on like from above. And then this is
3:17:01
literally responsible for just presentational how does it look right?
3:17:06
So like button, reject button and so forth. Okay.
3:17:12
So in this case restart the server go back and you see now at the high level
3:17:18
on the tab on the main screen on reject what do we do on like what do we do? Disabled if it's if it's the current
3:17:25
profile. So handle reject. You see handle reject and then we pass it into the upper function. So you see how we
3:17:30
abstract complexity, right? Just go ahead and destroy the like button cuz we're on we're on a row right now,
3:17:37
right? And then the profile view is the big final one. Okay. So now if I was to go ahead and hit refresh,
3:17:46
you can see we don't see the tabs yet at the moment. So something is broken. So
3:17:52
we're going to have to fix that in a moment. So, let me just go ahead and actually
3:17:58
comment this one out. I want to see what's going on. So,
3:18:03
so there's a lot in these builds lately. I get so carried away and we get so indepth with it. It's wild. So, app
3:18:12
layout, we have the stack. Yep. This was the main one and then we had the on boarding one and then we go to tabs and
3:18:19
then it was the index. Now, this
3:18:27
Now here, h I didn't install anything new, so I
3:18:33
don't need to necessarily have
3:18:39
another rebuild.
3:18:45
It's interesting why we can't see the the part
3:18:58
So,
3:19:05
this is this is actually quite a big debugging step for me right now. So, the icons. No, we don't need this right now.
3:19:12
It's fine. Um,
3:19:20
I'm just thinking if Oh, start page. God damn. That's why. Okay. So, this is
3:19:29
happening because uh if we go into index, it's not
3:19:34
exported. Yeah. So, this is actually not this. This is actually discover screen.
3:19:40
Yeah.
3:19:46
There you go. I was never exporting it. Okay, that was that was pretty intense.
3:19:52
I had to find that one quick. Discover screen. There you go. Right. Uh, we made it. So, now I need to show the cards
3:19:59
come up. So, that means inside of the
3:20:06
here profile view. Now for profile view we need to create
3:20:15
that view. The view I'm talking about is this. So this profile view. So the card
3:20:21
at the top and then you scroll down and you can see everything. So profile view
3:20:28
is going to be a component inside of touch. It goes locked in. Yeah. Fully
3:20:34
locked in right now. Um, profile
3:20:41
profile view. So, profile view.tsx. What am I doing? Why am I doing that? Doesn't need to be that here. We can do this a
3:20:47
profile view. So, let's ride through this bit. So,
3:20:52
we have two props, user and the distance. Right? The reason why we have the distance is because we want to see is how close they are to render here.
3:20:58
And then we have the actual user for the profile card. Right? So, we have the
3:21:04
insets for the safe area views. Then we have the photos. Right now, I'm rendering placeholders behind it. I
3:21:09
don't think you should do that. Um, you can change that if you want. Then we have the handle photo tapping to set the current index. We can probably Yeah, we
3:21:16
can replace this with the other component if you want to. Uh, I didn't do it. I should have done that. But the
3:21:21
photo indicators we reused from earlier. The photo tap zones we re reused from earlier. No, that's right. That is
3:21:27
right. Sorry. The handle photo tap is just handling it here. We just passed in this. We are using it.
3:21:34
Then we got the navigation buttons which are basically going to be these glass style buttons at the top over here.
3:21:39
Really nice. And also these three, four, six, however many pictures you have are
3:21:44
going to come up as well. So navigation buttons meaning the length is
3:21:51
it'll be oh yeah, we got to name and age first. Name and age overlay is this one. And then we have the images render
3:21:57
underneath it. So you see here photos length is greater than one. You have that photo gallery where you have these
3:22:02
images. When you touch it, it will set the index to that picture. Okay. Then you have the content section and
3:22:09
interest which is just going to reuse our glass chips, those glass views. And
3:22:14
then we've got the adaptive view for the elegant card at the bottom. So, who are you looking for? You can't see it right
3:22:19
now, but it says at the bottom who you're looking for. Okay. Now, in order to test this, obviously, it's not going
3:22:27
to work right now because we don't have any dummy data, right? So, in this case, we have no profiles. So, how do we how
3:22:33
do we get past this this hurdle? Okay, this is where AI comes in clutch because we can do something really nice. We can
3:22:39
seed lots of uh dummy data, right? So, I'm going to show you a ultimate hack
3:22:45
which I think everyone should just know, right? That everyone should know this now. So, inside the GitHub repo, I've
3:22:51
created a seed.ts ts file inside of the convex. Right? So over here, so you have
3:22:59
all of your cloud functions at the moment. I'm going to create one called seed.ts. Okay. And then we've got
3:23:07
something called uh sample data demo profiles. Okay. So I've given you
3:23:15
the following. So we've we've actually got a folder inside a convex called
3:23:25
sample data and inside of here we've got the demo profiles. Now I'll break it down exactly
3:23:32
what I'm talking about but step one you got the demo profiles. So these are just some dummy profiles and I used AI to
3:23:38
generate all of this. So the they're the dummy profiles, right? So we got the demo demo de demo profile base, the
3:23:45
name, date of birth, gender, bio, and so forth. And then age to date of birth little utility that it's going to use.
3:23:51
Then we've got San Francisco locations because the simulator is based in San Fran. So I wanted when I'm testing, I
3:23:57
want to see matches that are near me in San Fran. Okay. So I asked it generate a couple of things in San Fran. Then I
3:24:03
said, give me uh a max distance setup. Right? In this case, they just got max distance in miles, bigger steps, and so
3:24:10
forth. And then we've got the base profiles. So these are individual like women's profiles, men's profiles, and so
3:24:15
forth. So uh step one, you can see like name, date of birth, woman, bio, looking
3:24:21
for interest, and then their photos. And these photos are all image unsplash. That's why for one person, it was like
3:24:27
different photos cuz it's just getting them from Unsplash. All right. And it just created a bunch of different girls.
3:24:32
And then it also done the same for a bunch of different guys. So you can test it with girls and guys. Okay. And
3:24:38
scrolling all the way down and you can see it's just down to the bottom. Then you got the demo profiles which is effectively just exporting them or with
3:24:45
the locations. Okay. So we basically export the profile with the spread operator. We append the location and the
3:24:51
max distance. Now this is where it gets really good. So what we now just did is
3:24:57
you see here it uploaded the functions to the back. And what I've done here is
3:25:03
I've helped you out a ton. I've created a couple of CLI commands based on these cloud functions which basically allow
3:25:09
you to do some really cool things. So what you can do is you can see demo profiles create 10 fake users with
3:25:14
actual vector embeddings. So these are going to be real vector embeddings that we generate. So it will use your API key when you do this for open AI. Then we
3:25:22
can seed swipes for a user. So we can even test and make like say make all of the girls swipe on the account. Right?
3:25:30
You can make it limited likes. So you can say only make three girls like swipe on the account and so forth. Clear all
3:25:35
the demo profiles, clear all the swipes, clear daily pics, and then you see even uh for a specific user and so forth. So
3:25:42
lots and lots of different helper functions. You can go through the seed file and see for yourself how I did it.
3:25:48
But all this is doing is creating those nice demo profiles. So we can either run it from the CLI
3:25:54
or I'll show you another place you can run it. So if you go to your convex dashboard, go to your functions, simply
3:26:00
go to seed here. Right? Now if we go to create demo profiles. So create demo
3:26:08
sequ demo profiles. Run the function add run
3:26:14
action. So now what you should be able to see look creating demo profiles. Boom. And this is doing for every user
3:26:20
it's creating actual vector embeddings. You see look. So now if we go into our app. Hey, it's gone ahead and added in
3:26:28
these actual users now, which is pretty sick. So, it's actually seeded in all these users. That's pretty
3:26:35
damn cool. Okay, so this is where you can just go to that next level in your development like side of things.
3:26:43
Like just think about it like like what we just did in that moment. Like that's kind of crazy like you know and like
3:26:50
this is where you like think outside the box and how fast you can iterate and grow and it's nuts. So if I was to go
3:26:56
ahead and hit X now you see ah the whole flow is working. So our filtering is working the ability to like is working
3:27:02
and so forth. Now let's test out the match model. So obviously I want to be matched here. Okay. So step one I need
3:27:10
to find out my clerk user ID. Okay. So I know that my name is Sunny. Um but I've
3:27:17
got basically let's say I've created a couple of likes here. Okay. So firstly I need to go ahead and seed um swipes for
3:27:26
my user. Okay. So this command here but I don't know what my clerk ID is. Now yes I could go ahead and console log my
3:27:32
clerk uh user ID and so forth. But this is what I'm going to show you how to use an MTP server from convex to be able to
3:27:39
do the whole thing really nicely. So let's go ahead and do it right now. So, I'm going to go ahead and open up the agent view. And then here, what I can do
3:27:46
really nicely is I can say I can paste in that command and I can say use the
3:27:52
convex mcp and then I can say I can just go ahead and start talking to it. I can say I
3:27:59
want to go ahead and seed swipes for my user who is logged in. It is actually my name. So, check the database for
3:28:05
somebody called Sunny Sanger. There are two accounts so you might as well see them for both.
3:28:12
And then you see we're using super super whisper and you can feel free to download that use coupon code sunny
3:28:17
you'll get some freebies. And now watch what this will do. So obviously I can run that command myself with the user ID
3:28:23
of the clerk user I'm logged in as and we can get that by the way by going over here going to the users table right and
3:28:31
then I can actually get the user ID of the clerk. So obviously I got to find where Sunny is. So Sunny Sanger here and
3:28:38
you can see clerk ID is here, right? So I need to get that clerk ID. So but I'm
3:28:45
showing you that the AI can do it with MCPS. So this is pretty damn powerful.
3:28:50
So now you can see it's actually going ahead and it's it's
3:28:56
going ahead and querying the data the users table. The output is large sunny angle. Oh. Uh,
3:29:04
it actually spelled my name wrong. Um, SA. Yeah, you see that it's actually starting to Oh, wow. That's cool. Let me
3:29:11
search for SA. And then I've seen demo Cameron. Sorry, I should
3:29:17
have said Sunny. SA is the name. And then I can force it in by pressing
3:29:24
command enter. Let me find Sunny in the data. Data is in a single line. You can't
3:29:30
grab. So there you go. Let me find users with the name Sony Sanger.
3:29:36
The point is you can do that and it will actually find you. Um, and this is good. Obviously, right now you could go and
3:29:41
find the individual user. But the point is is that you see like imagine you got millions of users and you kind of need
3:29:46
to move really quick. This takes cognitive load off. You can just go ahead and say, "Yeah, go use MCP server.
3:29:51
Figure that out. Uh, help me out." Like this is where gen like coding is going towards. So you see that it's seated for
3:29:58
both users now. Okay. Now what I can see is if I go ahead and look here,
3:30:04
you can see that Madison, Scarlet likes Sunny, Madison likes Sunny, Penelopey
3:30:09
likes Sunny, Chloe likes Sunny, Riley likes Sunny. Now, if we were to hit a like,
3:30:14
for example, area, hit like. Let's see. Look at that. It's a match. There you
3:30:20
go. Pretty damn cool, right? And then we can keep on swiping. Go ahead and like. And now I'm probably Yeah, I've got
3:30:26
matches with everyone now, right? So you can go ahead and clear the swipes and so forth. But you see that is pretty
3:30:32
powerful stuff, right? So MCP servers are a must. That is literally what we're
3:30:37
going to be teaching inside our new community. So if you are interested and you want to learn all about that and be at the forefront of it all, go join zero
3:30:44
to full stack hero and you'll be the first to go ahead and get an email when we go ahead and launch it and you'll get
3:30:49
50% off for absolute life. So go check it out. Right. So at this point you can see that's pretty cool and it works
3:30:55
really nice. Now we're done with the swiping part. So this is where we can actually run pretty quick cuz the rest
3:31:01
of it is actually not hard. Like I wouldn't say it's hard. This was the hardest part to get to. Now what we do
3:31:06
is we build out the rest of the screens. So what we want to do now is go ahead and build out AI matches chat and
3:31:14
profile. Cool. So let's do app tabs. And now we need to create the tabs. Okay. So
3:31:20
the next tab we're going to create is going to be the matches.tsx. All right.
3:31:26
So matches is going to have we've actually already created a lot of the components for this. So I'm going to
3:31:33
pull it in and slowly run down what's in each bit. So matches.tsx. Now firstly we
3:31:38
need a countdown cuz we don't have that. And you can see a lot is happening here. But we don't have any red, right? Which
3:31:44
means we've done most of the things. And this just means that the chat screen is not created which is perfect. We actually have everything ready except
3:31:50
this. So first I'm going to do this and then I'll come back and explain this code. So components UI the countdown was
3:31:56
the last one we needed. So if we go to our UI countdown
3:32:03
I will show you countdown.tsx. Now all this is is a simple countdown which just
3:32:08
goes ahead and tax down until your next daily fresh picks are going to get
3:32:14
generated. Right? And date function you see that one is countdown. So we need to
3:32:20
install this library fn day fs. We go to our separate terminal pmpmi day fns
3:32:31
and then let that do its thing.
3:32:39
Yep. And then close that. Come back. Let that do its thing. Close back. And we
3:32:44
are good. Okay. Now let's go down and figure this out. So here you can see uh
3:32:50
I'm just going to keep that open so you can see where we're at. Daily pics with users. These are only erroring up because we don't have a chat screen yet.
3:32:56
That's why. Right. Types for daily pics for users. You can probably actually go ahead and don't worry about that. That's
3:33:01
fine. Yeah. Interface daily pics data. You can actually you can actually change
3:33:07
this to pull from convex. I'm not going to do it right now, but you can. Um but here we have it. Daily pick screen
3:33:13
current user using our use current user hook. Use query. This will go ahead and get the daily pics for the user. Okay?
3:33:20
And the reason I've done this quite clever because what this will do is it will go and get the existing daily pics.
3:33:26
If there aren't any existing daily pics, say it's the first time you run that page or say they were expired. Okay,
3:33:33
then it will go ahead and uh return no. Um
3:33:39
we actually do it here. It will return no. And then basically if it returns no
3:33:44
it will generate the daily pics. So you see here generate daily pics we we got the action here we use that in here. So
3:33:53
if daily pics is no so we have no daily pics. Remember it return back if there was nothing there or if it expired then
3:34:00
it would start generating your daily pics and that would trigger the UI set is generating and that's how we can
3:34:06
basically render out the the UI on the front of the screen and that's it. And then you just have the data come through
3:34:11
and then you just basically showcase the data on the front here. All we have is just like um some some
3:34:18
let me see what we have handle like for pick. This is if you want to like one of those cards. So act on daily pick. This
3:34:26
by the way is a act on daily pick action. And all it's doing is it's basically just creating a like on that.
3:34:34
Um so update pick stat. So, it's creating a like on the daily pick for that person. And if it was uh if it's
3:34:41
liked, it'll create a swipe, which will also then in turn create um check for a
3:34:48
match because look, create swipe internal which as a part of that create
3:34:53
swipe and checks for a match, right? So, it's really like powerful like it's
3:35:00
quite cool how it works, right? And then that will trigger the match modal route and all that stuff. Right?
3:35:06
So I'm going to show you down here. Render the pick card. Daily pick card we already created earlier.
3:35:12
The loading statuses. This is all just presentational. It's fairly straightforward. And yeah, that's pretty awesome. So now
3:35:19
and then we have the flat list which is basically an efficient way of rendering out an array. So in this case, we pass in the array which is the pending pix.
3:35:26
We render each individual array item and then you've got things like horizontal snap to the interval that basically
3:35:33
allows us to have this snapping behavior. So let's test it out. Let's go to AI matches and boom. Okay, you see
3:35:38
when I swipe it snaps. So if I let go, you see how it's snapping to the nearest
3:35:43
card, right? And you see how I've got the tap zones works great. I can scroll down. I've got the matching working.
3:35:50
Otherwise, it would have been the same number. It actually finds my same interest and so forth. We can probably
3:35:55
add a little bit more padding here, but overall beautiful. Looking awesome,
3:36:00
right? Um, this loading for Metro. I don't know why that's popping up. We can just cut.
3:36:07
Yeah, let's close this for a sec.
3:36:16
Opening on iOS. A bit of a weird little bug. Okay.
3:36:21
I mean that. Yeah. Oh, click it. Yeah. So let's go ahead and try it. So say for example I've got recommended Ava, right?
3:36:28
I've got the seeded swipe. So here you go. Boom. Same flow. Now I can keep on swiping two of two. And let's say for
3:36:35
example uh Amelia um I can't X these ones because daily
3:36:40
picss are like you would have only those daily picss. So let's just get rid of these and we can see the empty state. So
3:36:46
say I I like that one. In this case, I am in a bit of a weird corner.
3:36:53
Um,
3:37:01
let's do this one. Okay, there you go. So, you've seen today's pics. Come back
3:37:06
tomorrow. So, chances are I wasn't matched with that one. So, I sent a like, but I didn't match. Right. So,
3:37:13
you've seen today's pics and then you see like after that it will generate the next ones. So next up we have the chat
3:37:18
and the profile. Okay. So the chat is next.
3:37:28
So for the chat we have an actual chat ID screen. So it's going to be chat with
3:37:33
a for/ ID. So here it's chat with a forward slash wild card. And this is
3:37:41
resembling the actual uh ID for the chat that we're planning to go into. Okay.
3:37:48
Now, in here, we've got a few things we need to address. Firstly, this stuff is fairly straightforward. I'll go through
3:37:53
it in a minute, but the main thing is here, the components for the chat, the chat header, the chat input, the empty
3:37:59
chat state, and the message list of the like what's inside the chat. Then we have use optimistic messages.
3:38:05
Okay, this one is important because that slight delay was bothering me. You
3:38:11
probably wouldn't even notice it, but the slight delay was bothering me. So, I want it so when I type in and I hit enter, it's bam, it's immediate. So,
3:38:17
that's how we basically get over that. And then here we've got the we're basically the normal state set up,
3:38:22
right? We got the match, we got the user ID, the match details of who on that chat screen is basically been matched
3:38:29
with. Uh, by the way, this is the individual chat. So before we even get into this, I want to actually address
3:38:36
the actual top level chat which is that actual tab. So chat.tsx is what we
3:38:41
should have done first. So this would have been the chat tab at the bottom.
3:38:47
So here we need to set up the messages convex back end. This is rendering chat
3:38:53
items. So this is just going to be the chat rows. So you know the different chat rows that we can see. So, I don't
3:39:00
think we saved that screenshot, but the different chat rows uh when you were last chated when you
3:39:06
last chatted to them and also the last uh message and also one thing that's pretty cool is in that chat screen we
3:39:13
have it so that it will show if you've read the message or not. Okay.
3:39:20
So, I want to show here where is it? Messages the flat list. Yep. Render chat
3:39:27
item. see for the plat list and this will render out each individual message
3:39:32
and you see item unread count. So it show you how many unread messages there are and that's because each message is
3:39:40
has a red uh toggle on it and then we basically have a a bubble up approach to
3:39:46
that. So let's do the messages convex side of things. So heading back over to convex and then convex messages.
3:39:57
So messages.ts we got get messages simple get query pass in the match ID of
3:40:03
who you matched with and get all those messages. Send a message is a mutation. Basically we verify that the sender is
3:40:09
part of the match otherwise someone else could send random messages. And then we make sure that yeah you're the actual
3:40:15
authorized sender. Then we insert the message right mark as red. This is in a
3:40:20
mutation as well. So obviously when you go onto a chat it should mark those messages as red. Get unrest message
3:40:27
count for the user more of a helpful one. Right. So we're filtering it where
3:40:32
red is false and then we map through and basically get that back or filter through get me
3:40:39
get matches with the last message. So this is this is very helpful because this is what we used in the actual chat
3:40:46
screen. So when you go there it will show the last message someone sent to you and that will have also the unread
3:40:51
count on that message and uh and then yeah and also as part of that it will
3:40:56
have the unread um counts. Okay and we sort by the last message time.
3:41:03
Cool. So now we have the API for the messages. Next step is
3:41:11
Oh, so we actually should be able to see that now. So the only reason why we can't is because of this chat one. So
3:41:18
these chat components. So let's create the chat components right now. So
3:41:24
um save your energy from learning new according firstly. Uh yeah 100% did uh
3:41:30
components chat. So components chat. Now, these are going to be the actual
3:41:37
chat components. So, the actual chat messages themselves. So,
3:41:45
I don't know if I actually clicked into a chat to show you the message. I'm sure I did in the beginning, but yeah, I have a nice little seeding demo function for
3:41:51
that as well. Um, but components, chat, index. So, first things first, like we
3:41:57
done before, we have an index. We have five things we're going to build in here. Empty chat state, message bubble, message list. Let's start with an empty
3:42:02
chat state. Easy star empty chat state. It's a dumb component. It just says you match with someone says something nice
3:42:09
to start the conversation. So it could be a picture of them. You match with them. If there's no messages, this is
3:42:14
what we'll see. Okay, that's easy enough. Then we've got the message bubble, which is the individual message
3:42:19
bubble. This one is literally a very very s simple thing. It's just going to be the actual message little blue
3:42:26
bubble, you know, like the iMessage style approach. Um, we even have a retry mechanism. So
3:42:33
if it did fail to send on retry, if we pass in from above, that would allow us
3:42:40
to have a retry send function. Okay. Message list.
3:42:46
Next one. And this is going to use the use optimistic messages hook that I need to create. So the message list is just
3:42:52
going to render out the messages. So literally the list of messages that you'll see. Then we have the chat input
3:42:58
and the chat header. So chat input is going to be this one. And again, haptics. You see how we're using haptics
3:43:04
everywhere, right? Um, and again, you could really like abstract this to such
3:43:10
a high level of every time you send a message, a haptic must get sent either way. So you can do this at so many different levels, but glass support for
3:43:16
iOS 26 and so forth. So here step pullback. Oh, I should have used my my
3:43:22
other glass view, but you can refactor this if you want. And then we have the chat header
3:43:30
which is going to be the name and the image of the person that you're speaking to. Okay. So now with that,
3:43:39
this one is freaking out because of the hooks. So we need to use optimistic messages hook. So
3:43:47
use optimistic messages.
3:43:52
So this one is basically what we're doing is we take what convex message
3:43:58
looks like right which is this it has ID we actually add in one more field so
3:44:04
basically what we're doing here is this is the actual uh document from convex so
3:44:09
we're casting from that document that's why you see doc messages we're emitting the ID and the creation time because
3:44:16
we're adding our own ID and creation time that's why you can see emit and then we're extending that type with the
3:44:22
following with the our own ID is optimistic is true and then status sending and failed when the new one
3:44:28
comes in it will replace those once it's ready okay and then we have the combined
3:44:34
message type which is the optimistic message plus the messages and then we have the use optimistic message this is our
3:44:41
props for this hook okay so the main thing that this does is it has
3:44:46
optimistic messages state in it like an array right where it keeps track of all the optimistic messages we send. Then
3:44:55
you see find which optimistic messages have been confirmed by the server. So what's happening behind the scenes is
3:45:00
the second I hit uh send it shows on the screen. Like the second I hit it, it shows on the screen. This is not a
3:45:07
pre-recorded stream. SPS 100x. No. Uh I love calling people out on that stuff,
3:45:12
right? But um the the optimistic message. Yes. So as soon as you hit
3:45:18
send, it will go on to the um shouldn't reply to people, but it throws
3:45:24
me off. As soon as I hit send, it will go on to the messages on the on the top. And then what happens is is the actual messages will load and then this
3:45:31
confirmed uh optimistic ids will go ahead and uh basically mark which ones
3:45:37
are have already been read basically or it'll start swapping out the optimistic ones as a confirmed message. Okay.
3:45:46
So clean up confirmed optimistic messages and that way we don't get this huge bloated uh optimistic messages um
3:45:55
chat um you're using expose skills to update your app. Uh I used it to update from
3:46:00
SDK 54 to 55. Yes. Um you call me confirms live. Yeah. See
3:46:07
messages use memo. I love doing that because people then realize oh my god he's actually live. Um no server
3:46:14
messages with depending optimistic ones. you can see for yourself how we do it. But effectively, yes, an LLM helps
3:46:19
massively with this stuff by the way. Right. Um, okay. So, and then of course
3:46:25
the main thing is under it all handle send. That's the actual most important part here. So, send message
3:46:35
that comes from above. And that send message is actually the more important part because that's actually what sends
3:46:41
the message off to um what's it called? sends it off to
3:46:49
convex. Okay, so the next thing is the chat use optimistic messages. That's
3:46:55
good now. So let's see here are save area view. So we've got error
3:47:01
somewhere tabs chat component chat ID
3:47:08
import components chat. I think we're good now. refresh.
3:47:25
After a lot of changes, you will have to rebuild naturally sometimes. Yeah. AI matches. Boom. Chats. Hey, we got loads
3:47:32
of new matches. Okay. So, now I can see my new matches. Let's go ahead and click in. So, for example, Amelia. And you can
3:47:38
see I don't have I can't click into those yet because we don't have the chat
3:47:46
set yet. So chat
3:47:53
interesting. So we should have had that working. Um,
3:48:01
so inside the tabs index, not layout.
3:48:09
Let me just double check my top level.
3:48:15
It's quite unique. I appreciate it, dude. We got Madagascar in the house. Yo, what is up, dude? Once again, 100%
3:48:21
unique. I appreciate that. Uh, so I want to see both layout. Um,
3:48:41
so um
3:48:46
chat
3:48:55
Interesting. Why my Oh, I know why I keep making silly
3:49:02
mistakes today. Wow. This chat should not be in here. This chat should be, but this chat should be outside above.
3:49:11
It's actually a different route. So, look, you see tabs. These are the tabs that you see. And then chat is a
3:49:17
different one. That's why
3:49:23
that was failing. Why is that one complaining?
3:49:30
Profile. Profile view. profile.
3:49:53
Oh, item swipe con action. Do we not have these yet? Oh, we don't we didn't
3:49:58
do uh for this swipe action buttons. I don't think we did it either. Um Oh, nice. Thank you so much uh for Augustine
3:50:06
for the donation. I appreciate you so much, dude. Um
3:50:12
he goes, "Thank you once more." I appreciate that so much. Thank you, dude. I appreciate that. It means a lot, especially after nearly four hours on
3:50:19
stream. Um Razul says, "Hey, I have a question. How do you handle Moan database design with
3:50:25
convex? What's the easiest way? Super base is kind of straightforward on tripping." It's actually quite easy to do. multi-tenant. We do it tons uh with
3:50:32
SAS companies. Um I can't explain it all on this right now what we're building, but you can feel free to join zero to
3:50:38
full stack hero and uh when we have a next coaching call in the new community uh you can join in 50% off and you can
3:50:45
go ahead and um yeah learn from me. Uh but right now obviously I can't talk about it but on on the stream but you
3:50:50
can have a multi-tenency pretty easily. I mean I don't think it's that difficult to do. Um do you use any tools when
3:50:57
streaming? Yeah, we did today. We used a few situations today where we got it back in. All right. So, if I press it
3:51:04
now, we should we should have been able to swipe
3:51:09
through. So, I need to stop ignoring that bit. So, no
3:51:16
route name deleted profile. Yes. No route name profile ID. Yes. No. Too much screen.
3:51:35
So the chat ID is there. So chat. Yes, there we go. I was thinking I
3:51:43
was like I don't know what's going on. Uh let's try now a say hello world.
3:51:50
Monk K. Okay. Yep. The keyboard avoiding view works. And then obviously she's not
3:51:55
going to reply because we don't have that yet. So what I did do to actually help out with the replying situation is
3:52:02
I well not replying but it'll just seed a bunch of things is I actually Oh I
3:52:07
didn't actually do Okay. So I'm going to show you a trick now. So good question from Paul. So I'm going to show you
3:52:13
right now about an AI trick. Right. So here I'm going to say uh let me turn the
3:52:19
music down for this one and I'll show you a cool example. So uh I need to seed
3:52:27
uh lots of test messages for my current user who has logged in. Uh my name is
3:52:32
Sunny Sanger. So find my account in Convex and seed tons of uh test images
3:52:39
from the people who have matched with me. So that way it looks like there's conversations going on. So now what I'll
3:52:46
show you what it does. So basically check this out. So let that happen. That's super whisper in case you're
3:52:52
wondering. We come in here. We just change the name here to Sunny Sanger.
3:52:57
Um I'll say use the CLI directly. You also
3:53:04
have access to So I can just talk to it. You also have access to Convex MCP
3:53:09
server. Now I can turn the music back on. So now what's going to happen is boom, go ahead
3:53:15
and let that do its thing. And what it will do is it will literally have access to the convex uh MCP server understand
3:53:21
that it can go ahead and add data. So let me first check explore the convex
3:53:26
unit to understand data structure then find your account and seed messages to you. It's pretty cool right? So because
3:53:32
an MCP server effectively gives our agent tools right so in this case it's got tools. So it can go and read the
3:53:39
database it can go and read the users. Um, so because it knows that and it has access to the code, it understands the
3:53:45
structure of the code. So it knows how it can see data into our database. This is crazy good because in the past it
3:53:51
would be so hard to to do that. Let me find your user account and matches. So it's basically finding who I'm matched
3:53:57
with now. So this is pretty awesome. So let's go back over here. I found Sunny's
3:54:03
account. Let me find your matches. So it should say Ava, Olivia, Amelia, Chloe,
3:54:09
and Arya. Let that do its thing. We can have a water break while it's working away.
3:54:21
So, it's doing it. So, there's two accounts called Sunny
3:54:30
Sanger. Check the other.
3:54:38
So now it will basically check and exclude the first one and then that's how it's going to figure this out. I can
3:54:44
already tell you now. So obviously I know how we could do this manually but that could take time and typically
3:54:49
that's what you would have to do or you'd have two devices and you'd have to log in with the other account and yeah.
3:54:55
So found two accounts. Let me check if the newer account has matches which is correct. It's the newer account. And
3:55:00
then of course after this we do the profile screen and then we're golden. Second account has five matches. There
3:55:05
it is. Look at that guys. It found these matches. That's five matches area. Now let me add
3:55:11
seed functions to create test messages. So it's going to actually Okay, it's going to create uh seed functions into
3:55:18
our seed. TS file. So this is a prime example of how I was creating those seed
3:55:23
functions, right? So look at this. So,
3:55:31
and of course you can ask for it to move that into a test fun file and so forth, whatever you want to do.
3:55:45
So, let that just build out. I don't understand anything. I'm new here. Uh well I mean right now we're in the
3:55:50
depths of it so it's probably going to have to watch the video from the beginning uh to truly understand but um
3:55:57
right now we're so you see like sample conversations is from user and then in this case it's got a bunch of sample
3:56:03
conversations now it's running that function because by saving it would have deployed. So yeah and I seeded 12
3:56:11
messages to match with Olivia C did 10 messages to match with Olivia Chloe and
3:56:16
they made it even in a reusable way. So this structure is basically it will work with any user. Now create seed message
3:56:22
match ID, sender ID, content red. Yeah, awesome stuff. And now look at this. Ah,
3:56:29
nice. Yeah, the course is by the way guys, in case you're wondering, someone just asked about the course. Feel free. You
3:56:36
got all the code by the way in the description down below. So you can feel free to get all the code. And then of course 024.com/course.
3:56:43
Go ahead and check it out. But look at this awesome stuff. Now if I click it, boom. I can see the chat. Nice. I can
3:56:49
say awesome stuff. Right. You see like now you can have your full chat going. You see that
3:56:55
optimistic is sending and then it will go ahead and check on the database to make sure that it goes ahead and pulls
3:57:00
in. I think because I seeded it, it might be a bit strange, but let's see in a different chat for a sec. Oh no, that
3:57:06
would have worked because it just popped up. Hi. Say hi. Sending hi. Yep, there you go. Hello
3:57:14
there. Awesome stuff. Nice. I thought I just had a No. Okay. Sorry.
3:57:22
Yeah. Amazing stuff. And now look, you can see even the unread messages and so forth.
3:57:32
See, super nice. And this is a cool way of testing, right? So, it just goes to show you like there's so many ways you can use AI to have help like help you
3:57:40
code. And this is where you need live streams like this that are 4 hours, 5 hours sometimes to just go into the depth of it to see the real kind of use
3:57:46
cases where you can really do some cool stuff with it. Um because that helps a ton when you're building, right? And
3:57:53
because it has MTP MTP, it can access convex. You can do like it's just very very cool, right? What you can do. So
3:57:59
the chat is working. The AI matching is working. And then we have the over this. This is all good. We click like. We
3:58:06
should hit a like. Yep. Send her a message. We can go straight to her chat. Look, you match with Zoe. Fresh chat.
3:58:11
And then you can say, "Yo." And then you can start talking away. The optimistic update is working. Boom. Amazing. All
3:58:17
right. Next up, we have the profile. And then I believe we're golden. So, profile
3:58:25
um ID is using I'm using cursor. Yeah. By the way, guys, quick question before
3:58:31
we move on to the profile section. Serious question here. Are you interested in a community that can teach
3:58:37
you all of this stuff? So I'm talking about from like uh a very affordable
3:58:42
community like a super affordable like a Netflix style subscription where every month you can see coaching calls like
3:58:48
this where we go in depth all the content will teach you everything about AI coding from zero to a million right
3:58:55
like to nextg developer status let me know uh you're going to use foundation
3:59:00
model any um no we're using it ourself our own models uh cool so in this case
3:59:07
then We have the final tab which is the profile tab. Okay,
3:59:16
profile. Okay, profile.tsx. Now here we have photo item which I deleted I think.
3:59:22
Um but in this case handle sign out button is going to be there. This is going to be the managing profile screen.
3:59:28
So you know you saw it over here where we show the profile, we show the edit button, we show your profile details and
3:59:35
then the sign out option is there. Now, having a prompt to stop you by accidentally clicking it, saying, "Are
3:59:41
you sure you want to sign out?" is super easy. You just say, "Alert, do alert and so forth." Handling the edit, however,
3:59:47
is a little bit more intricate, but we're going to use a lot of our previous stuff that we've already used. We just also smashed over 200 likes. Thank you
3:59:54
guys. Destroy that like button if you're enjoying the content. Right. So, now
3:59:59
what I'm going to do is um Sorry, I've gone a bit blank for a sec.
4:00:07
Okay, so 4 hours. Thank you so much, dude. All right, so at this point, we got the profile. So the actual profile
4:00:14
screen itself, we need to have this profile item photo item. Sorry. This one. So
4:00:23
uh and he's prompting with Opus really expensive. Uh yeah, it's it's actually you know what it's
4:00:30
not. It's if you understand the the capability of what you can do with something and it's literally $200.
4:00:37
I don't think it's expensive at all really for what you can do with that. It's uh it's all down to
4:00:44
that that means that in my opinion you're just not skilled with it. You need to level up your knowledge with how
4:00:50
to do this stuff because I see it as a no-brainer. I pay for by the way full transparency I play for Claude Code
4:00:56
Ultra $200. I paid for Cursor Ultra um $200 because yeah, it saves us a ton of
4:01:03
time. But I don't again like super like respectfully, it's not about bragging.
4:01:08
It's just I use this stuff like to help me with a ton of different areas of the business.
4:01:13
Um but I don't trust the output without fully checking it myself. So don't just blindly trust it. Okay. Now, photo IM is
4:01:20
super easy. It's just basically if the image is a normal image, we render it. Otherwise, uh we're going to get the
4:01:27
URL. Uh we skip it if it's a direct URL. Uh
4:01:33
otherwise, we'll go ahead and get that URI URL, sorry. And then we simply render
4:01:39
out an image, right? So, it's just a simple placeholder which has a bit of a fallback to populating the image. To be
4:01:45
honest, we don't actually need it that much anymore because we already have the getting you know um the images with the
4:01:56
URLs inside of Convex. We change that. Um but here we have the edit profile screen after this. Okay. So,
4:02:04
uh yes, it would be great as nowadays various channels and this is just
4:02:09
promise but it's not theory and no real set examples. That's what we found. We found the same thing. That's why
4:02:15
honestly feel free to if you just you know what if you just sign up to the code and get it for free today you'll be
4:02:20
on the email list and then we'll send you access to the new community once we go live which is will be very soon. So
4:02:27
uh you'll be one of the first to be able to join. Okay. So
4:02:35
edit profile is next. Yeah. So we have the profile button here and you can see I can see my whole profile. I click on
4:02:41
edit. Right now, we don't have the edit profile screen. So, in order to get the edit profile screen,
4:02:47
what we're going to do is we're going to go ahead and do
4:03:06
all right. So, I would have refactored this. I should
4:03:11
have refactored this. I feel like it's a bit messy, but it will do. Um,
4:03:18
edit profile tsx. Well, firstly, I just want to see if it's the right one that
4:03:23
I've done here. So, edit profile. Yes, it is. Yeah. So, you can see
4:03:29
firstly, just to let you know, so you can see we've got the glass morphism, the liquid glass effect. Everything is
4:03:34
here. and we can change all of our settings. Okay, so I'll run you through exactly how because you'll see I didn't
4:03:40
have to create any new component, right? But I've chucked it all in one file,
4:03:45
which is kind of not good. And also the padding is not nice here. So we need to change that, right? But typically it
4:03:50
should be like this. And then we can make a few style changes. But the main thing is is that it actually all still works fully. So what I've done here is
4:03:58
I've reused the same components that we used in the onboarding phase. Right? So
4:04:03
during the onboarding phase, we went ahead and used a ton of different components. We used like the photo picker, we had name, bio, we had the
4:04:10
date of birth. What the the thing that I would have changed here in a refactor is I would have probably made it so you
4:04:17
don't have everything dunked out like this. Um because having 600 500 600
4:04:24
lines of code like this is not my style. I'll really have it like neater. Uh even
4:04:29
the gender section and all this kind of stuff. um we should be able to yeah so all I've done here is I've reused the
4:04:36
same components now what happens so firstly I want to pay attention to one thing so here we can still you know
4:04:42
exact same interfaces what we had in the on boarding the main thing is if we were
4:04:48
to go ahead and for example you can update your location I'm not letting them set the location because some people change you know they cheat and
4:04:54
they say like oh I'm in London and so forth uh so if I was to go ahead and change the max distance now when I save
4:05:00
changes the amazing Amazing part here is it actually generates new vector embeddings. So that's the cool part.
4:05:07
Okay. So I want to firstly showcase that. Right. So let's go down to filter
4:05:13
and sort. Let's do by name.
4:05:19
Um screw it. I'll just show you. I know Sunny is here and I know the vector
4:05:26
embeddings are here. So, what you'll see is if I change anything here. So, let's
4:05:32
just say I change my I change some information about me. Say I no longer like this, but I like wine and yoga,
4:05:38
right? And then I change some preferences. No, not not only will the rest of the fields change, but look at
4:05:44
this one in particular. So, one of these two. Hit save. Now, look what's going to happen. You see that? ah completely made
4:05:51
new vector embeddings which means now my new AI matches are going to be um
4:05:58
basically changed the the likely like like the the likeliness okay um
4:06:07
so that's that's that basically yeah awesome but the main thing I want to showcase is more uh here if we go back
4:06:13
over here this so let's say for example instead of going through line by line
4:06:18
code here we already know how each of these works because we covered this inside the onboarding flow. Instead, I'm
4:06:24
going to show you an example of how you can use plan mode in in cursor to basically go ahead and refactor this to
4:06:30
be super clean, right? So, and I'm actually this is me doing it above time, right? We could actually wrap up right
4:06:36
now, but I kind of want to show you that. So, here I could say, for example, uh refactor
4:06:42
uh edit profile. So, we don't have So, I can even talk to
4:06:48
it to be honest. I was just want to show you guys how fuzzy you can be here. So that we don't have lots of repeated
4:06:55
code logic. I don't want this file to be 4 500 lines long. It should be very high
4:07:00
level where we basically can just see name field, bio field, date of birth. Uh and then we have a couple of highle
4:07:07
pieces of state which keep track of everything but it should not be a long file or um the actual edit profile page
4:07:14
itself. And then I click save changes. The whole logical flow should remain the exact same. Now go ahead and submit
4:07:22
that. So that'll do it. Now I'm not going to hit okay straight off the bat. And you see I'm not going to check it too much. I'm just going to go into plan
4:07:28
mode. I'm going to hit okay. And now bear in mind, yes, you have to be in a pretty decent reasoning model. Opus GPT
4:07:34
codeex or something like that. But now in plan model, plan mode is going to help me derive a plan to refactor based
4:07:41
on what I what I did there. So let's see what it does. Let me take a
4:07:46
look at this. D structured. So now it can go ahead and jump in and it'll start
4:07:53
it'll basically write up a proposal, a plan now. Okay. Um, do you notice the value keeps going higher and higher and
4:07:58
deeper? Honestly, guys, it's getting crazy. The builds like I told Jay, I'm like, "Jay, I think we'll be done in 3 hours this time." And then next thing
4:08:04
you know, I'm like, "Jay, we're 5 hours in, dude. I don't know. I think we got another hour left." Um, but yeah, the
4:08:11
bills are getting crazy big. That's why we give the code for absolutely free now because they're getting massive. Um and
4:08:16
I get carried away building but I don't want to make them simpler. I want to keep on going to more higher extents. Um
4:08:23
yeah so let's let that create it plan. Now you can see look edit profile refactor. So the current plan the
4:08:29
current file is 707 line long. So it's coming up with a bunch of you know solutions there. So the target is 100 to
4:08:38
150 lines of code. And this is exactly how I would have wanted it refactored. So I prefer stuff like this. Yeah. I
4:08:46
prefer when it's very much high level on the top level. So I call it like a these
4:08:51
are this is the presentational component. No, but this is the the highle component, right? And then we
4:08:56
have the lower components who handle the more in-depth bits. So you see create use edit profile form hook and then
4:09:03
centralizes all the form state and the handlers. creates the form section component, reusable section wrapper with
4:09:09
consistent styling, and then creates interest selector component, creates photo editor component, create location
4:09:15
editor component, refactored, and so forth. So, what we're going to do is I'm going to go ahead and trigger this on a
4:09:21
job. We're going to run through everything that we covered today and then uh we're going to come back and see
4:09:26
how the new code looks, right? So, we're going to trigger that off and it's going to start building and you guys can see for yourself like how, for example, you
4:09:33
can have it do pretty good refactoring jobs. And typically, just for full FYI, what I would have done before I actually
4:09:38
triggered that job is typically typically commit my code. So, I would have a nice clean slate and then I would
4:09:46
basically go ahead and get it to do a job. I would review literally do like a pull request review on the the edit that
4:09:53
it did and then I would make sure like every I'm happy with everything and then I would commit that and then proceed
4:09:59
what I'm doing and I have several of these running using git work trees typically. So that's how I'm working as
4:10:06
a nextgen dev right now right in my own uh company in my own stuff right so you
4:10:11
can see like right now it's already started to go ahead and build things out it's sort of shifted the responsibility to a use hook so use edit profile form
4:10:20
right and then the form section itself is basically a wrapper and then you can see like photos editor and it's starting
4:10:26
to do this now and then of course I can even then go to the extent and be like you know what use these components inside of the on boarding flow as well.
4:10:34
So you can go to so many different extents. Now while that's happening in the back, let's go ahead and talk about
4:10:40
how we made the whole thing possible today because there was so much that we covered. It's kind of wild, right?
4:10:46
Firstly, the base. Like how did we get all of this beautiful liquid glass stuff happening going on, right? Of course, it
4:10:53
was Expo, right? Expo allowed us to do this. And also, you saw I didn't even plan on doing this, right? You saw a
4:11:00
full demo of the new expo skills. Go allow me to upgrade from expo 54 to 55
4:11:08
and iron out all the bugs pretty much with a single prompt. That was phenomenal. That was pretty awesome, guys. Using Expo skills, I was able to
4:11:15
upgrade from SDK 44. I was able to upgrade from S SDK 54 to 55 with a
4:11:22
single prompt. It was super like super simple, super sleek. And then of course I showed tons of demos inside a cursor
4:11:28
how we were able to use different MCP servers to make life so easy when we're you know whether it's seeding data for
4:11:35
our convex database whatever it might be this is kind of how the development side is working. Now you'll notice how these
4:11:42
tutorials are so important for the highlevel understanding of how to piece things together. Then of course you can
4:11:48
pretty much accelerate when you use AI assisted coding. And I don't call it vibe coding because vibe coding in my
4:11:54
mind is basically where you just trust it blindly and you have no idea about what's going on. I call it assisted
4:12:00
coding because in the end of the day I'm still with it. I'm still doing a lot of things. Yes, I have agents running in the background but a lot of the time,
4:12:08
most of the time or every time I'm always checking the work before it goes in to the final branch, right? So
4:12:14
there's always a review process, a very strict one. Um, and a lot of those things come into play. Now, of course,
4:12:20
to get all of this playing well together, of course, we needed authentication. That wouldn't have been
4:12:25
possible without the guys over at Clerk, right? So, uh, all of this beautiful authentication flow that you guys are
4:12:30
seeing. All of that was made possible by those guys. I'll show you one more time that we can sign up and show you the
4:12:36
entire signup flow that we did today, which was absolutely awesome. So, I'm going to do a fresh account right now.
4:12:42
Um, let's go ahead and create that account. Jay, if you can send me the OTP, please. Uh, and let's go ahead and
4:12:49
while we're doing that, let's check. And you can see, look, he already completed the work. So, now I want to go ahead and see while Jay is getting me that OTP,
4:12:56
let's have a look, guys. Let's see about that form. Let's see if it made it the edit profile screen much simpler. You
4:13:02
can see, look, removed a ton of code, shifted the responsibility elsewhere, and now
4:13:08
this should be much more sleek. So if we would to have a look, you guys can see
4:13:14
stack screen. Yeah, that's that's already much nicer. I mean the edit profile went from 700 lines of code to
4:13:21
200. It's a big improvement, right? We got a glass. This isn't the edit profile, is it? Yeah, it is form
4:13:26
section. Yeah, that the glass view. Awesome stuff. And it works. And that's
4:13:32
a lot cleaner now. And we've abstracted, you know, to another place, right? So
4:13:39
Jason sent me the OTP 901 9991. Verify email,
4:13:45
right? What's your name? Let's just do Sunny uh Sanger.
4:13:52
You know, while we do this as well, and there's only one song that gets me hyped to finish up. Let's do Sunny Sanger. Let's go over here.
4:14:02
There we go. It's the only way we can now do it. And of course, look, these same components.
4:14:07
You could probably use reuse them as well. I'm a man. Search for a woman. And then you say just different ages.
4:14:13
You can mess around with it. Again, all glass components. Look at that. Like super nice glass components. And you've
4:14:19
got the nice kind of, you know, even these buttons over here. Glass. You go back and forth. Enable locations. We use
4:14:25
expo location today as well. Write your bio. I love coding. It's cool.
4:14:31
Go ahead and continue. And then you can do a couple of these. Complete your profile. Then we have vector embeddings
4:14:38
with uh comparison search. So let's go ahead and do this. Boom. Choose. Continue. Again, you can fix
4:14:45
that with a safe area very quickly. Created my embeddings. And then just like that, we have all of the entire
4:14:52
flow, right? We have the AI matches getting found. Finding your perfect match. right now.
4:14:58
Sophia, Chloe, Mia, and it's obviously showing me based on who is most compatible. We have the chat, which we
4:15:06
can seed for, and I showed you guys how to do that earlier. And then if we go to edit, let's see the new edit flow. Look
4:15:11
at that, guys. Absolutely awesome. Works. So, the functionality is still there. If we were to change something
4:15:17
and click on save changes, boom, we have it. So, it's pretty damn awesome. Pretty powerful, guys. And you guys can see for
4:15:24
yourselves. We can like everything is super fast. And that's the way we would expect it for a dating app. So you guys learned it
4:15:31
here first. We built an entire AI dating app today live on stream in 4 hours 15
4:15:39
minutes and uh you guys get all of the code for absolutely free. So you guys can literally go and get it all right
4:15:45
now over at the description below. All right, make sure you go ahead fill out
4:15:51
this form, full name, email, and also while you're signing up to Clerk and Expo, please do use the links in the
4:15:56
description. It is so important because it allows me to keep on doing this for free and keep on bringing this value to
4:16:02
you guys. It takes a tremendous amount of work for us over this side to be able
4:16:07
to build these out. And uh trust me, I'm constantly building, building, building. You also learn how to use Convex
4:16:13
Realtime Database. So, as always guys, I hope you enjoyed this video. Make sure you smash that like button, hit the
4:16:20
subscribe button, and as always guys, it's your boy Sunny aka Papa React, and I will see you in the next one. Make
4:16:25
sure you join React.com/course cuz we have a new community coming and you guys are going to love it. For those
4:16:30
of you who like the AI coding inside of here, go check it out. Popper.com/course.
4:16:36
Join. You get 50% off on a new community. All right, guys. Ciao. I'll see you in
4:16:41
the next one. Peace.