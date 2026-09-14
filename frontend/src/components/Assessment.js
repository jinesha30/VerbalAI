import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Assessment.css';
import './ScienceEnhancements.css';
import { hindiAssessmentDataGroups } from '../data/hindiAssessmentData';
import { grade5HindiComprehensionData } from '../data/grade5HindiComprehension';
import { grade6HindiComprehensionData } from '../data/grade6HindiComprehension';
import { grade7HindiComprehensionData } from '../data/grade7HindiComprehension';
import { marathiAssessmentDataGroups } from '../data/marathiAssessmentData';
import { grade5MarathiComprehensionData } from '../data/grade5MarathiComprehension';
import { grade6MarathiComprehensionData } from '../data/grade6MarathiComprehension';
import { grade7MarathiComprehensionData } from '../data/grade7MarathiComprehension';
import { grade1ScienceData } from '../data/grade1ScienceData';
import { grade2ScienceData } from '../data/grade2ScienceData';
import { grade3ScienceData } from '../data/grade3ScienceData';
import { grade4ScienceData } from '../data/grade4ScienceData';
import { grade5ScienceData } from '../data/grade5ScienceData';
import { grade6ScienceData } from '../data/grade6ScienceData';
import { grade7ScienceData } from '../data/grade7ScienceData';
import { mathsAssessmentDataGroups } from '../data/mathsAssessmentData';
import AssessmentFeatures from './AssessmentFeatures';
import ReviewMode from './ReviewMode';
import { getDifficultyVariant, getQuestionsWithHints, recommendDifficulty } from '../utils/difficultyManager';

const API_URL = 'http://localhost:5000/api';

// Multiple card groups for randomization
const assessmentDataGroups = {
  '1': [
    // Group 1: Animals
    [
      { type: 'word', name: 'CAT', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400' },
      { type: 'word', name: 'DOG', image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400' },
      { type: 'word', name: 'BIRD', image: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=400' }
    ],
    // Group 2: Fruits
    [
      { type: 'word', name: 'APPLE', image: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400' },
      { type: 'word', name: 'BANANA', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400' },
      { type: 'word', name: 'ORANGE', image: 'https://images.unsplash.com/photo-1580052614034-c55d20bfee3b?w=400' }
    ],
    // Group 3: Objects
    [
      { type: 'word', name: 'BALL', image: 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400' },
      { type: 'word', name: 'BOOK', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400' },
      { type: 'word', name: 'CAR', image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400' }
    ],
    // Group 4: Body Parts
    [
      { type: 'word', name: 'HAND', image: 'https://wallpapers.com/images/file/hand-pictures-j3pzd8cbkohu7tul.jpg' },
      { type: 'word', name: 'FOOT', image: 'https://c8.alamy.com/comp/W0X7H4/female-foot-leg-standing-on-toes-line-drawing-of-feet-isolated-on-white-background-vector-illustration-eps-10-W0X7H4.jpg' },
      { type: 'word', name: 'EYE', image: 'https://static.vecteezy.com/system/resources/previews/000/606/261/original/eye-logo-vector.jpg' }
    ],
    // Group 5: Nature
    [
      { type: 'word', name: 'TREE', image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400' },
      { type: 'word', name: 'FLOWER', image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400' },
      { type: 'word', name: 'SUN', image: 'https://images.ctfassets.net/hrltx12pl8hq/3PHSQUIo1jOzeug2XNNSjk/cb4f9c298aaf7dfc4a68e03d1e11f5fd/sun-images.jpg?fit=fill&w=1200&h=630' }
    ]
  ],
  '2': [
    // Group 1: Animals Playing
    [
      { type: 'sentence', text: 'This is a cat.', image: 'https://static.vecteezy.com/system/resources/previews/002/098/203/non_2x/silver-tabby-cat-sitting-on-green-background-free-photo.jpg' },
      { type: 'sentence', text: 'This is a dog.', image: 'https://jooinn.com/images/cute-dog-1.jpg' },
      { type: 'sentence', text: 'These are birds.', image: 'https://png.pngtree.com/background/20230613/original/pngtree-group-of-different-colored-birds-on-a-branch-picture-image_3425217.jpg' }
    ],
    // Group 2: Daily Activities
    [
      { type: 'sentence', text: 'It is a book.', image: 'https://th.bing.com/th/id/OIP.6TSI2meSPYX3i2L9kfBYkgHaEB?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3' },
      { type: 'sentence', text: 'Apple is red.', image: 'https://th.bing.com/th/id/OIP.qifhWqCyBF4AojwMUhicIgHaEu?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3' },
      { type: 'sentence', text: 'It is an ocean.', image: 'https://tse1.mm.bing.net/th/id/OIP.Y09P-66N8Yn13Ra9-xsdVwHaEK?rs=1&pid=ImgDetMain&o=7&rm=3' }
    ],
    // Group 3: Nature Scenes
    [
      { type: 'sentence', text: 'The sun is bright.', image: 'https://images.ctfassets.net/hrltx12pl8hq/3PHSQUIo1jOzeug2XNNSjk/cb4f9c298aaf7dfc4a68e03d1e11f5fd/sun-images.jpg?fit=fill&w=1200&h=630' },
      { type: 'sentence', text: 'The flowers are yellow.', image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=400' },
      { type: 'sentence', text: 'The tree has leaves.', image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=400' }
    ],
    // Group 4: Family & Friends
    [
      { type: 'sentence', text: 'The shoes are black.', image: 'https://tse4.mm.bing.net/th/id/OIP.LguZTkvHclxQjqJAU8fkgAHaHa?w=640&h=640&rs=1&pid=ImgDetMain&o=7&rm=3' },
      { type: 'sentence', text: 'Kids are playing.', image: 'https://as2.ftcdn.net/v2/jpg/03/92/80/73/1000_F_392807349_X0ldE0erv74gA3YutBfO78MmjZMLfsK3.jpg' },
      { type: 'sentence', text: 'It is a rectangle.', image: 'https://cdn1.byjus.com/wp-content/uploads/2020/10/Properties-of-Rectangle.png' }
    ],
    // Group 5: School & Learning
    [
      { type: 'sentence', text: 'This is my school bag.', image: 'https://m.media-amazon.com/images/I/61gU89pCCxL._UL1200_.jpg' },
      { type: 'sentence', text: 'I write with a pencil.', image: 'https://th.bing.com/th/id/OIP.Q3Hk7vMkykmZNA38Kzvw6QHaHZ?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3' },
      { type: 'sentence', text: 'The class is learning math.', image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400' }
    ]
  ],
  '3': [
    // Group 1: Science & Discovery
    [
      { type: 'sentence', text: 'The moon is white and it shines bright at night.', image: 'https://cdn.pixabay.com/photo/2021/06/26/06/52/moon-6365467_1280.jpg' },
      { type: 'sentence', text: 'Plants need water and sunlight to grow.', image: 'https://static.vecteezy.com/system/resources/thumbnails/030/455/628/small_2x/young-plant-growing-in-garden-with-sunlight-generative-ai-photo.jpg' },
      { type: 'sentence', text: 'Butterflies are very beautiful and they have colorful wings.', image: 'https://tse3.mm.bing.net/th/id/OIP.Dx1kiKZ0Kge2pFje15L-dAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3' }
    ],
    // Group 2: Community & People
    [
      { type: 'sentence', text: 'The doctor helps sick people to recover from their illness.', image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400' },
      { type: 'sentence', text: 'Farmers grow food for everyone which requires a lot of hardwork.', image: 'https://img.freepik.com/premium-photo/farmers-are-planting-rice-farm-farmers-bend-grow-rice-agriculture-asia-cultivation-using-people_41722-1571.jpg?w=1800' },
      { type: 'sentence', text: 'Firefighters save lives bravely by fighting against fire.', image: 'https://cdn.pixabay.com/photo/2016/11/23/04/53/firefighters-1851945_1280.jpg' }
    ],
    // Group 3: Weather & Seasons
    [
      { type: 'sentence', text: 'Dark clouds come in the sky. Rain falls from dark clouds.', image: 'https://img.freepik.com/premium-photo/heavy-rain-falling-from-grey-clouds-overcast-sky-high-resolution_1124577-15219.jpg' },
      { type: 'sentence', text: 'Snow covers the ground white and it looks like a white blanket.', image: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=400' },
      { type: 'sentence', text: 'When wind is blowing, leaves often shed from trees.', image: 'https://th-thumbnailer.cdn-si-edu.com/cLOUWPuHFeZkz5Q-XTg6arlmIcg=/800x600/filters:no_upscale()/https://tf-cmsv2-photocontest-smithsonianmag-prod-approved.s3.amazonaws.com/d322f921d943eca421146db1d606e05ffee20e07.jpg' }
    ],
    // Group 4: Animals & Habitats
    [
      { type: 'sentence', text: 'Fish swim in the ocean .', image: 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=400' },
      { type: 'sentence', text: 'Bears sleep in winter caves.', image: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=400' },
      { type: 'sentence', text: 'Eagles fly very high above the sky and they are very fast.', image: 'https://tse1.mm.bing.net/th/id/OIP.gl_cSoALU40ljZZblhT3rAHaFN?rs=1&pid=ImgDetMain&o=7&rm=3' }
    ],
    // Group 5: Sports & Activities
    [
      { type: 'sentence', text: 'Children are playing football together and enjoying it.', image: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?w=400' },
      { type: 'sentence', text: 'Swimming is good daily exercise and it makes a person fit.', image: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=400' },
      { type: 'sentence', text: 'Reading makes you very smart and it is a good habit.', image: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400' }
    ]
  ],
  '4': [
    // Group 1: Nature and Environment
    [
      {
        type: 'paragraph',
        text: 'Trees are very important for our planet. They give us oxygen to breathe and fresh air. Trees also provide shade on hot sunny days. Many birds and animals make their homes in trees. We should plant more trees and take care of them.',
        image: 'https://images.pexels.com/photos/1080400/pexels-photo-1080400.jpeg?auto=compress&cs=tinysrgb&h=750&w=1260'
      }
    ],
    // Group 2: Historical Story
    [
      {
        type: 'paragraph',
        text: 'Mahatma Gandhi was a great leader of India. He believed in peace and non-violence. Gandhi helped India gain freedom from British rule. He taught people to fight for their rights peacefully. His birthday is celebrated as a national holiday in India. People all over the world respect him for his courage.',
        image: 'https://wallpapers.com/images/hd/mahatma-gandhi-digital-portrait-2v11p1z1mqqndjpp.jpg'
      }
    ],
    // Group 3: Science and Discovery
    [
      {
        type: 'paragraph',
        text: 'Water is essential for all living things. Our body is made up of seventy percent water. We need water for drinking, cooking, and bathing. Plants and animals also need water to survive. We should not waste water and keep it clean. Always remember that water is precious.',
        image: 'https://th.bing.com/th/id/OIP.VqBe-OpOvmRXQNAEIKDmgQHaEf?o=7rm=3&rs=1&pid=ImgDetMain&o=7&rm=3'
      }
    ],
    // Group 4: Moral Values
    [
      {
        type: 'paragraph',
        text: 'Honesty is a very important quality. Honest people always speak the truth. They do not cheat or lie to others. When you are honest, people trust you more. Being honest makes you feel good about yourself. Everyone should try to be honest in their life.',
        image: 'https://www.billabonghighschool.com/wp-content/uploads/2024/02/blog-20-Ways-to-Teach-the-Importance-of-Honesty-to-Kids.jpg'
      }
    ],
    // Group 5: Indian Culture
    [
      {
        type: 'paragraph',
        text: 'India is a land of festivals and celebrations. People celebrate Diwali, Holi, Eid, and Christmas with great joy. During festivals, families come together and share happiness. They prepare special food and wear new clothes. Festivals teach us about our culture and traditions. These celebrations bring people closer to each other.',
        image: 'https://cdn.educba.com/academy/wp-content/uploads/2023/12/Festivals-of-India.jpg'
      }
    ]
  ],
  '5': [
    // Group 1: Monarch Butterflies & Coral Reefs
    {
      type: 'comprehension',
      title: 'Monarch Butterflies',
      paragraph: 'Monarch butterflies are some of the most fascinating insects in the world. Every year, millions of these orange and black butterflies embark on an incredible migration journey. They travel up to 3,000 miles from Canada and the United States to central Mexico. This journey takes them several months to complete, and they fly during the day using the sun as their guide. Amazingly, no single butterfly makes the entire round trip. Instead, it takes multiple generations of monarchs to complete the full migration cycle. The butterflies that make the journey south live much longer than other generations, surviving up to eight months. During their migration, monarchs face many dangers including bad weather, predators, and habitat loss. They rest in trees along the way, sometimes covering entire branches with their colorful wings. When they finally reach Mexico, millions of monarchs cluster together in oyamel fir forests high in the mountains. Scientists are still studying how these tiny creatures can navigate such enormous distances with incredible accuracy.',
      questions: [
        { text: 'How far do monarch butterflies travel during migration?', answer: '3000' },
        { text: 'Where do monarch butterflies migrate to?', answer: 'MEXICO' },
        { text: 'How long do migration butterflies live in months?', answer: 'EIGHT' },
        { text: 'What guides monarchs during daytime flight?', answer: 'SUN' }
      ]
    },
    // Group 2: Ancient Egypt & Volcanoes
    {
      type: 'comprehension',
      title: 'Ancient Egypt',
      paragraph: 'Ancient Egypt was one of the most advanced civilizations in human history. The Egyptian civilization lasted for more than 3,000 years along the banks of the Nile River. The Nile was essential to Egyptian life because it provided water, food, and transportation in the middle of a desert. Every year, the river would flood and deposit rich, fertile soil along its banks, perfect for growing crops. Ancient Egyptians built incredible structures that still amaze us today, including the pyramids and the Sphinx. The Great Pyramid of Giza was built around 4,500 years ago and remained the tallest human-made structure for nearly 4,000 years. Egyptians developed one of the first writing systems called hieroglyphics, which used pictures and symbols to represent words and sounds. They made many important discoveries in mathematics, medicine, and astronomy. Egyptian pharaohs were believed to be living gods, and when they died, they were mummified and buried with treasures for the afterlife. The discovery of King Tutankhamun\'s tomb in 1922 gave scientists valuable insights into ancient Egyptian culture and daily life.',
      questions: [
        { text: 'How long did Egyptian civilization last in years?', answer: '3000' },
        { text: 'What river was essential to Egypt?', answer: 'NILE' },
        { text: 'What is the Egyptian writing system called?', answer: 'HIEROGLYPHICS' },
        { text: 'Whose tomb was discovered in 1922?', answer: 'TUTANKHAMUN' }
      ]
    },
    // Group 3: Animal Communication
    {
      type: 'comprehension',
      title: 'Animal Communication',
      paragraph: 'Animals have developed amazing ways to communicate with each other without using words. Dolphins use a series of clicks, whistles, and body movements to share information with their pod members. Scientists believe that each dolphin has a unique signature whistle that acts like a name. Honeybees perform a special dance called the waggle dance to tell other bees exactly where to find flowers with nectar. The dance includes information about the direction and distance to the food source. Elephants can communicate with low-frequency sounds called infrasound that travel through the ground for miles. These rumbles are so low that human ears cannot hear them, but other elephants can detect them with their feet and trunks. Many animals use body language and facial expressions to show emotions like fear, happiness, or aggression. Fireflies flash their lights in specific patterns to attract mates and warn off predators. Even trees can communicate with each other through underground fungal networks, sharing nutrients and warning signals. The more we study animal communication, the more we realize how complex and sophisticated these systems really are.',
      questions: [
        { text: 'What dance do honeybees perform?', answer: 'WAGGLE' },
        { text: 'What low-frequency sound do elephants use?', answer: 'INFRASOUND' },
        { text: 'What acts like a name for dolphins?', answer: 'WHISTLE' },
        { text: 'Why do fireflies flash their lights?', answer: 'MATES' }
      ]
    }
  ],
  '6': [
    // Group 1: Solar System
    {
      type: 'comprehension',
      title: 'The Solar System',
      paragraph: `The Solar System consists of the Sun and all the objects that orbit around it. There are eight planets in our Solar System that revolve around the Sun in elliptical paths. Mercury is the closest planet to the Sun and experiences extreme temperatures. Venus is the second planet and is covered with thick clouds of sulfuric acid. Earth is the third planet and the only one known to support life as we know it. Mars is called the Red Planet because of its reddish appearance caused by iron oxide on its surface. Jupiter is the largest planet in our Solar System and has a giant storm called the Great Red Spot. Saturn is famous for its beautiful rings made of ice and rock particles. Uranus rotates on its side unlike other planets which makes it unique. Neptune is the farthest planet from the Sun and appears blue in color due to methane in its atmosphere. Scientists study the Solar System to learn more about our cosmic neighborhood and the formation of planets.`,
      questions: [
        { text: 'How many planets orbit the Sun?', answer: 'EIGHT' },
        { text: 'Which planet is closest to the Sun?', answer: 'MERCURY' },
        { text: 'What is the largest planet in our Solar System?', answer: 'JUPITER' }
      ]
    },
    // Group 2: Photosynthesis
    {
      type: 'comprehension',
      title: 'Photosynthesis',
      paragraph: `Photosynthesis is the process by which green plants make their own food using sunlight. Plants have a green pigment called chlorophyll which captures energy from sunlight. This process takes place mainly in the leaves of plants where chlorophyll is most abundant. During photosynthesis, plants take in carbon dioxide from the air through tiny pores called stomata. They also absorb water from the soil through their roots which travels up to the leaves. The sunlight energy is used to convert carbon dioxide and water into glucose, which is a type of sugar. Oxygen is released as a byproduct of this process which is essential for all living beings. Plants use the glucose for energy and growth, and they store extra glucose as starch. Photosynthesis is vital for life on Earth because it produces oxygen and food. Without photosynthesis, there would be no oxygen in the atmosphere for animals to breathe. This process also helps to reduce carbon dioxide levels in the atmosphere, which is important for our environment.`,
      questions: [
        { text: 'What is the green pigment in plants called?', answer: 'CHLOROPHYLL' },
        { text: 'What gas do plants take in during photosynthesis?', answer: 'CARBON' },
        { text: 'What gas is released as a byproduct?', answer: 'OXYGEN' }
      ]
    },
    // Group 3: Water Cycle
    {
      type: 'comprehension',
      title: 'The Water Cycle',
      paragraph: `The water cycle is the continuous movement of water on, above, and below the surface of the Earth. Water exists in three states: solid as ice, liquid as water, and gas as water vapor. The cycle begins with evaporation when the Sun heats up water in oceans, lakes, and rivers. The water changes from liquid to gas and rises into the atmosphere forming water vapor. As the water vapor rises higher, it cools down and undergoes condensation forming tiny water droplets. These droplets combine together to form clouds in the sky which can contain millions of water droplets. When the droplets become too heavy, they fall back to Earth as precipitation in the form of rain, snow, or hail. Some of this precipitation flows over land as runoff into streams and rivers. Some water seeps into the ground and becomes groundwater which feeds wells and springs. The water eventually returns to oceans, lakes, and rivers where the cycle begins again. The water cycle is crucial for distributing fresh water across the planet and supporting all forms of life.`,
      questions: [
        { text: 'What is the process called when water turns into vapor?', answer: 'EVAPORATION' },
        { text: 'What forms when water vapor cools and condenses?', answer: 'CLOUDS' },
        { text: 'What is it called when water falls from clouds?', answer: 'PRECIPITATION' }
      ]
    },
    // Group 4: Indian Freedom Struggle
    {
      type: 'comprehension',
      title: 'Indian Freedom Struggle',
      paragraph: `The Indian Freedom Struggle was a long and difficult journey towards independence from British colonial rule. The British East India Company began trading in India in the early 1600s and gradually took control of the country. For nearly two hundred years, India remained under British rule which exploited its resources and people. Mahatma Gandhi emerged as a great leader who believed in non-violent resistance and peaceful protests. He launched several movements like the Non-Cooperation Movement and the Civil Disobedience Movement to fight against British rule. The Salt March in 1930 was a famous protest where Gandhi and his followers marched to the sea to make salt. Many other freedom fighters like Jawaharlal Nehru, Subhash Chandra Bose, and Sardar Patel also played crucial roles. The Quit India Movement of 1942 was a major campaign demanding an end to British rule. After years of struggle and sacrifice, India finally gained independence on August 15, 1947. This day is celebrated every year as Independence Day with great pride and patriotism. The freedom struggle taught us the values of courage, unity, and perseverance in facing challenges.`,
      questions: [
        { text: 'Who led the non-violent resistance movement?', answer: 'GANDHI' },
        { text: 'In which year did India gain independence?', answer: 'NINETEEN' },
        { text: 'Which movement was launched in 1942?', answer: 'QUIT' }
      ]
    },
    // Group 5: Renewable Energy
    {
      type: 'comprehension',
      title: 'Renewable Energy',
      paragraph: `Renewable energy comes from natural sources that can be replenished or renewed constantly. Unlike fossil fuels which are limited and cause pollution, renewable energy is clean and sustainable. Solar energy is captured from the sun using solar panels that convert sunlight into electricity. Wind energy uses large turbines to convert the power of wind into electrical energy. Hydroelectric power generates electricity by using the force of flowing water in rivers and dams. Biomass energy is produced from organic materials like wood, crops, and waste products. Geothermal energy comes from the heat within the Earth which can be used for heating and electricity. Renewable energy sources do not produce harmful emissions like carbon dioxide which contributes to climate change. Many countries are now investing heavily in renewable energy to reduce their dependence on fossil fuels. Using renewable energy helps to protect our environment and combat global warming. It also creates new jobs in manufacturing, installation, and maintenance of renewable energy systems. The future of our planet depends on our ability to transition to clean and renewable sources of energy.`,
      questions: [
        { text: 'What type of panels capture energy from the sun?', answer: 'SOLAR' },
        { text: 'What do wind turbines convert into electricity?', answer: 'WIND' },
        { text: 'What harmful gas do renewable sources NOT produce?', answer: 'CARBON' }
      ]
    }
  ],
  '7': [
    // Group 1: Climate Change
    {
      type: 'comprehension',
      title: 'Climate Change and Environmental Impact',
      paragraph: `Climate change refers to long-term shifts in global temperatures and weather patterns. While climate variations have occurred naturally throughout Earth's history, scientific evidence overwhelmingly shows that human activities have been the primary driver of climate change since the mid-20th century. The burning of fossil fuels such as coal, oil, and natural gas releases greenhouse gases into the atmosphere, particularly carbon dioxide and methane. These gases trap heat from the sun, creating a "greenhouse effect" that warms the planet. Deforestation compounds the problem because trees absorb carbon dioxide, and when forests are cleared, this natural carbon storage is lost. The consequences of climate change are far-reaching and include rising sea levels, more frequent and severe weather events, disruption of ecosystems, and threats to biodiversity. Scientists use sophisticated climate models and analyze ice cores, tree rings, and ocean sediments to understand past climate patterns and predict future changes. International agreements like the Paris Climate Accord aim to limit global temperature increases by reducing greenhouse gas emissions and transitioning to renewable energy sources.

The Arctic and Antarctic regions are experiencing some of the most dramatic effects of climate change. In the Arctic, temperatures are rising at twice the global average, a phenomenon known as Arctic amplification. This rapid warming is causing sea ice to melt at an alarming rate, with some projections suggesting ice-free Arctic summers could occur within decades. The melting ice has profound implications for Arctic wildlife, particularly polar bears, seals, and walruses that depend on sea ice for hunting and breeding. Indigenous communities in the Arctic face disruptions to their traditional ways of life as permafrost thaws, causing buildings to sink and releasing methane, another potent greenhouse gas. In Antarctica, massive ice shelves are breaking apart, and glaciers are retreating at unprecedented speeds. The collapse of these ice formations contributes to sea level rise, threatening coastal communities worldwide. Scientists monitor these changes using satellites, research stations, and sophisticated instruments. The loss of polar ice also creates a feedback loop: white ice reflects sunlight back into space, but when it melts, darker ocean water absorbs more heat, accelerating warming further.`,
      questions: [
        { text: 'What phenomenon describes Arctic temperatures rising at twice the global average?', answer: 'ARCTIC' },
        { text: 'Which two greenhouse gases are primarily mentioned as heating the planet?', answer: 'CARBON' },
        { text: 'What creates a feedback loop when polar ice melts?', answer: 'OCEAN' },
        { text: 'What international agreement aims to limit temperature increases?', answer: 'PARIS' }
      ]
    },
    // Group 2: Space Exploration
    {
      type: 'comprehension',
      title: 'Space Exploration and Discovery',
      paragraph: `Mars has captivated human imagination for centuries, and today it represents the next frontier in space exploration. Often called the Red Planet due to iron oxide on its surface, Mars is the fourth planet from the Sun and shares some similarities with Earth. It has seasons, polar ice caps, volcanoes, and canyons, including Valles Marineris, which is ten times longer and three times deeper than Earth's Grand Canyon. Multiple space agencies and private companies are working toward the ambitious goal of sending humans to Mars, possibly within the next two decades. The journey to Mars presents enormous challenges: it takes approximately seven months using current technology, astronauts would face prolonged exposure to cosmic radiation, and the psychological effects of isolation could be severe. Once there, explorers would need to deal with Mars' thin atmosphere, which is 95% carbon dioxide, and temperatures that can plunge to minus 125 degrees Celsius. Scientists are particularly interested in searching for signs of past or present microbial life, as evidence suggests Mars once had liquid water on its surface. Robotic missions like NASA's Perseverance rover are collecting samples and testing technologies that could support future human missions, including producing oxygen from the Martian atmosphere.

The International Space Station (ISS) represents one of humanity's greatest achievements in international cooperation and engineering. Orbiting approximately 400 kilometers above Earth, this football-field-sized laboratory travels at 28,000 kilometers per hour, completing one orbit every 90 minutes. The ISS serves as a unique research platform where astronauts conduct experiments impossible to perform on Earth due to the microgravity environment. These experiments span various fields including biology, physics, astronomy, and materials science, leading to discoveries that benefit life on Earth. For instance, research on the ISS has contributed to cancer treatments, water purification systems, and improvements in robotic surgery. The station has been continuously inhabited since November 2000, with crew members typically staying for six-month missions. Living in space presents unique challenges: astronauts must exercise two hours daily to prevent muscle atrophy and bone loss, adapt to sleeping while floating, and learn to eat specially prepared food. The construction of the ISS involved 15 countries and required more than 40 missions to assemble its various modules in orbit. It stands as a testament to what humanity can achieve when nations work together toward common scientific goals.`,
      questions: [
        { text: 'What is the name of the massive canyon on Mars?', answer: 'VALLES' },
        { text: 'How many minutes does the ISS take to complete one orbit?', answer: 'NINETY' },
        { text: 'What condition on the ISS makes experiments unique?', answer: 'MICROGRAVITY' },
        { text: 'What substance makes up 95% of Mars atmosphere?', answer: 'CARBON' }
      ]
    },
    // Group 3: Human Body Systems
    {
      type: 'comprehension',
      title: 'Human Body Systems',
      paragraph: `The circulatory system is a complex network that transports blood, nutrients, oxygen, and waste products throughout the human body. At the center of this system is the heart, a powerful muscular organ about the size of a fist that beats approximately 100,000 times per day, pumping roughly 7,500 liters of blood. The heart has four chambers: two atria that receive blood and two ventricles that pump it out. Blood travels through three types of vessels: arteries carry oxygen-rich blood away from the heart, veins return oxygen-depleted blood to the heart, and capillaries are tiny vessels where the exchange of oxygen, nutrients, and waste occurs. The circulatory system operates in two circuits: the pulmonary circuit moves blood between the heart and lungs for oxygenation, while the systemic circuit delivers oxygenated blood to the rest of the body. Red blood cells contain hemoglobin, a protein that binds to oxygen, giving blood its red color. White blood cells defend against infections, and platelets help blood clot to prevent excessive bleeding. The entire journey of blood through the circulatory system takes only about one minute, demonstrating the remarkable efficiency of this vital system.

The nervous system serves as the body's command center, controlling everything from breathing and heartbeat to thoughts and emotions. It consists of two main parts: the central nervous system, comprising the brain and spinal cord, and the peripheral nervous system, which includes all the nerves that branch out to the rest of the body. The human brain contains approximately 86 billion neurons, specialized cells that transmit information through electrical and chemical signals. These neurons communicate across tiny gaps called synapses, releasing neurotransmitters that carry messages to neighboring cells. The brain itself is divided into regions with specific functions: the cerebrum handles thinking, memory, and voluntary movements; the cerebellum coordinates balance and movement; and the brain stem controls automatic functions like breathing and heart rate. The spinal cord acts as an information superhighway, carrying signals between the brain and body. When you touch a hot surface, sensory receptors in your skin send signals through nerves to your spinal cord, which immediately sends back a command to pull away—all in a fraction of a second, often before your brain consciously registers the pain. This rapid response is called a reflex arc, one of many sophisticated mechanisms that protect and preserve the body.`,
      questions: [
        { text: 'What protein in red blood cells binds to oxygen?', answer: 'HEMOGLOBIN' },
        { text: 'How many chambers does the heart have?', answer: 'FOUR' },
        { text: 'What are the tiny gaps between neurons called?', answer: 'SYNAPSES' },
        { text: 'Which brain part coordinates balance and movement?', answer: 'CEREBELLUM' }
      ]
    },
    // Group 4: Ancient Civilizations
    {
      type: 'comprehension',
      title: 'Ancient Civilizations',
      paragraph: `The Indus Valley Civilization, also known as the Harappan Civilization, flourished around 2500 BCE in what is now Pakistan and northwestern India. This ancient society was one of the world's earliest urban civilizations, contemporary with ancient Egypt and Mesopotamia, yet it remained largely unknown until the 1920s when archaeological excavations began. The civilization's major cities, including Harappa and Mohenjo-Daro, demonstrated remarkable urban planning with grid-pattern streets, sophisticated drainage systems, and standardized fired-brick buildings. The uniformity of construction across different cities suggests a strong central authority or shared cultural practices. Perhaps most intriguing is the civilization's undeciphered script, found on thousands of seals and artifacts, which continues to puzzle scholars today. The Indus people were skilled craftspeople and traders, producing intricate jewelry, pottery, and bronze tools, and maintaining trade networks that extended to Mesopotamia. Their economy was based on agriculture, particularly wheat and barley cultivation, made possible by harnessing the Indus River's waters. Archaeological evidence suggests an egalitarian society with little wealth disparity compared to other ancient civilizations. Around 1900 BCE, the civilization began to decline, and by 1300 BCE, most cities were abandoned, though the exact reasons remain debated among historians.

The Maya civilization represents one of the most sophisticated and mysterious cultures of the ancient Americas, flourishing in Mesoamerica from around 2000 BCE until the Spanish conquest in the 16th century. The Maya developed an advanced writing system, one of the few fully developed written languages in the pre-Columbian Americas, using hieroglyphs carved on monuments and written in bark-paper books called codices. They were exceptional mathematicians who independently developed the concept of zero, and their astronomical observations were remarkably accurate. The Maya created multiple calendars, including the famous Long Count calendar that tracked vast periods of time, demonstrating their sophisticated understanding of celestial cycles. Their architectural achievements include massive stepped pyramids, ceremonial centers, and ball courts found throughout the Yucatan Peninsula, Guatemala, Belize, and Honduras. Maya cities like Tikal, Palenque, and Chichen Itza featured elaborate temples adorned with intricate stone carvings depicting gods, rulers, and historical events. Society was hierarchical, led by divine kings who performed religious rituals believed to maintain cosmic order. The Maya practiced advanced agricultural techniques including terracing and raised fields in swampy areas. Contrary to popular belief, Maya civilization did not completely disappear; while the classical city-states collapsed around 900 CE for reasons still debated, Maya people and culture continue to thrive today, with millions of descendants maintaining traditional languages and customs.`,
      questions: [
        { text: 'What are the bark-paper books of the Maya called?', answer: 'CODICES' },
        { text: 'Which two major cities were part of the Indus Valley Civilization?', answer: 'HARAPPA' },
        { text: 'What mathematical concept did the Maya independently develop?', answer: 'ZERO' },
        { text: 'What type of script remains undeciphered from the Indus Valley?', answer: 'INDUS' }
      ]
    },
    // Group 5: Technology and Innovation
    {
      type: 'comprehension',
      title: 'Technology and Innovation',
      paragraph: `Artificial Intelligence (AI) represents a transformative field of computer science focused on creating systems capable of performing tasks that typically require human intelligence. These tasks include visual perception, speech recognition, decision-making, and language translation. Machine learning, a subset of AI, enables computers to learn from data without being explicitly programmed for every scenario. Instead of following rigid instructions, machine learning algorithms identify patterns in vast datasets and improve their performance over time through experience. Deep learning, an even more advanced approach, uses artificial neural networks inspired by the human brain's structure to process information in layers, allowing computers to recognize complex patterns in images, sounds, and text. AI applications have become ubiquitous in daily life: recommendation systems suggest movies and products, virtual assistants respond to voice commands, and facial recognition unlocks smartphones. In healthcare, AI assists in diagnosing diseases from medical images, sometimes with greater accuracy than human doctors. Self-driving cars use AI to navigate roads, recognize obstacles, and make split-second decisions. However, the rapid advancement of AI also raises important ethical questions about privacy, job displacement, algorithmic bias, and the need for responsible development. As AI systems become more sophisticated, society must carefully consider how to harness their benefits while addressing potential risks and ensuring they serve humanity's best interests.

The transition to renewable energy represents one of the most critical technological and environmental challenges of our time. Unlike fossil fuels, which are finite and contribute to climate change, renewable energy sources harness naturally replenishing resources like sunlight, wind, and water. Solar power technology has advanced dramatically, with photovoltaic cells becoming increasingly efficient and affordable, making solar panels accessible to homeowners and businesses worldwide. These cells convert sunlight directly into electricity using semiconductor materials that generate electric current when exposed to light. Wind energy captures the kinetic energy of moving air through turbines, which can be installed on land or offshore in coastal waters where winds are stronger and more consistent. Modern wind turbines can generate enough electricity to power hundreds of homes and have become cost-competitive with traditional energy sources in many regions. Hydroelectric power harnesses flowing water's energy, typically through dams, and remains one of the largest sources of renewable electricity globally. Emerging technologies include tidal and wave energy systems that capture ocean movements, and geothermal energy that taps into Earth's internal heat. Energy storage technologies, particularly advanced batteries, are crucial for addressing renewable energy's intermittent nature, storing excess energy generated during peak production for use when the sun isn't shining or wind isn't blowing. The global shift toward renewable energy not only helps combat climate change but also creates new industries, jobs, and opportunities for sustainable economic development.`,
      questions: [
        { text: 'What type of networks does deep learning use?', answer: 'NEURAL' },
        { text: 'What cells convert sunlight into electricity?', answer: 'PHOTOVOLTAIC' },
        { text: 'What subset of AI learns from data without explicit programming?', answer: 'MACHINE' },
        { text: 'What technology is crucial for storing renewable energy?', answer: 'BATTERIES' }
      ]
    }
  ],
  'default': [
    [
      { type: 'word', name: 'BOOK', image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400' },
      { type: 'word', name: 'COMPUTER', image: 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=400' },
      { type: 'word', name: 'PHONE', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400' }
    ]
  ]
};

// Helper function to get random group
const getRandomGroup = (groups) => {
  const randomIndex = Math.floor(Math.random() * groups.length);
  return groups[randomIndex];
};

// Helper function to calculate word similarity
const calculateSimilarity = (word1, word2) => {
  const longer = word1.length > word2.length ? word1 : word2;
  const shorter = word1.length > word2.length ? word2 : word1;

  if (longer.length === 0) return 1.0;

  const editDistance = (s1, s2) => {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
       }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  };

  return (longer.length - editDistance(longer, shorter)) / longer.length;
};

const normalizeVisualArtifacts = (text = '') => {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters from copy/paste/rendering
    .replace(/[।॥]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper function to compare passages word by word with smart alignment
const comparePassages = (original, transcribed) => {
  if (!original || !transcribed) return [];

  console.log('=== Passage Comparison Debug ===');
  console.log('Original length:', original.length, 'chars');
  console.log('Transcribed length:', transcribed.length, 'chars');

  // Normalize text: remove punctuation, extra spaces, convert to lowercase
  const normalizeText = (text) => {
    return normalizeVisualArtifacts(text
      .toLowerCase()
      .replace(/[.,!?;:'"(){}[\]-]/g, '')); // Remove latin punctuation
  };

  const normalizedOriginal = normalizeText(original);
  const normalizedTranscribed = normalizeText(transcribed);

  const originalWords = normalizedOriginal.split(' ').filter(w => w.length > 0);
  const transcribedWords = normalizedTranscribed.split(' ').filter(w => w.length > 0);

  console.log('Original words:', originalWords.length);
  console.log('Transcribed words:', transcribedWords.length);
  console.log('First 10 original:', originalWords.slice(0, 10));
  console.log('First 10 transcribed:', transcribedWords.slice(0, 10));

  // Use sequence alignment algorithm (similar to diff) to match words
  // This handles word position shifts better than simple position matching
  const alignment = alignSequences(originalWords, transcribedWords, normalizedOriginal);

  console.log('Alignment complete:', alignment.length, 'pairs');
  console.log('=== End Debug ===');

  return alignment;
};

const canonicalizeEnglishNumberToken = (token) => {
  const cleaned = (token || '').toLowerCase().trim();
  if (!cleaned) return cleaned;

  const wordToNumber = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
  };

  if (/^\d+$/.test(cleaned)) {
    const num = Number.parseInt(cleaned, 10);
    if (Number.isFinite(num) && num >= 0 && num <= 20) {
      // Keep a canonical numeric form so "ten" and "10" are equal.
      return String(num);
    }
    return cleaned;
  }

  if (Object.prototype.hasOwnProperty.call(wordToNumber, cleaned)) {
    return String(wordToNumber[cleaned]);
  }

  return cleaned;
};

const canonicalizeWordForPassageMatch = (word) => {
  // Number equivalence for English passage comparison.
  return canonicalizeEnglishNumberToken(word);
};

const containsDevanagari = (text) => /[\u0900-\u097F]/.test(text || '');

const normalizeHindiToken = (token) => {
  if (!token) return '';
  return token
    .toLowerCase()
    .replace(/[।॥,!?;:'"(){}[\]-]/g, '')
    .replace(/़/g, '')
    .replace(/[ािीुूेैोौंँः]/g, '');
};

const canonicalizeHindiNumberToken = (token) => {
  const t = normalizeHindiToken(token);
  if (!t) return t;

  const devanagariToAscii = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };

  const converted = t.split('').map((ch) => devanagariToAscii[ch] || ch).join('');
  if (/^\d+$/.test(converted)) return converted;

  const map = {
    शून्य: '0', एक: '1', दो: '2', तीन: '3', चार: '4', पांच: '5', 'पाँच': '5',
    छह: '6', सात: '7', आठ: '8', नौ: '9', दस: '10', ग्यारह: '11', बारह: '12',
    तेरह: '13', चौदह: '14', पंद्रह: '15', पन्द्रह: '15', सोलह: '16',
    सत्रह: '17', अठारह: '18', उन्नीस: '19', बीस: '20', बयालीस: '42',
    बयालिस: '42', सैंतालीस: '47', सैंतालिस: '47', सैतालीस: '47'
  };

  return map[converted] || converted;
};

const similarityForPassageToken = (a, b, isHindi) => {
  if (isHindi) {
    const aNorm = canonicalizeHindiNumberToken(a);
    const bNorm = canonicalizeHindiNumberToken(b);
    if (!aNorm || !bNorm) return 0;
    if (/^\d+$/.test(aNorm) && /^\d+$/.test(bNorm)) {
      return aNorm === bNorm ? 1 : 0;
    }
    return calculateSimilarity(aNorm, bNorm);
  }

  const aNorm = canonicalizeWordForPassageMatch(a);
  const bNorm = canonicalizeWordForPassageMatch(b);
  return calculateSimilarity(aNorm, bNorm);
};

// Sequence alignment function - matches words by similarity, not position
const alignSequences = (original, transcribed, originalText = '') => {
  const m = original.length;
  const n = transcribed.length;
  const isHindi = containsDevanagari(originalText);
  const correctThreshold = isHindi ? 0.42 : 0.7;
  const weakThreshold = isHindi ? 0.24 : 0.4;

  // Create a matrix for dynamic programming alignment
  // dp[i][j] = {score, path} where score is alignment quality
  const dp = Array(m + 1).fill(null).map(() =>
    Array(n + 1).fill(null).map(() => ({ score: 0, from: null }))
  );

  // Initialize: gaps have a cost
  const GAP_PENALTY = -1;
  const MATCH_SCORE = 2;
  const MISMATCH_PENALTY = -1;

  for (let i = 0; i <= m; i++) {
    dp[i][0] = { score: i * GAP_PENALTY, from: 'up' };
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = { score: j * GAP_PENALTY, from: 'left' };
  }
  dp[0][0] = { score: 0, from: null };

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const origWord = original[i - 1];
      const transWord = transcribed[j - 1];

      // Calculate similarity for match/mismatch
      const similarity = similarityForPassageToken(origWord, transWord, isHindi);
      const matchScore = similarity >= correctThreshold ? MATCH_SCORE : MISMATCH_PENALTY * (1 - similarity);

      // Three options: match, gap in original, gap in transcribed
      const diagonal = dp[i - 1][j - 1].score + matchScore;
      const up = dp[i - 1][j].score + GAP_PENALTY;
      const left = dp[i][j - 1].score + GAP_PENALTY;

      if (diagonal >= up && diagonal >= left) {
        dp[i][j] = { score: diagonal, from: 'diagonal' };
      } else if (up >= left) {
        dp[i][j] = { score: up, from: 'up' };
      } else {
        dp[i][j] = { score: left, from: 'left' };
      }
    }
  }

  // Backtrack to find the alignment
  const alignment = [];
  let i = m, j = n;

  while (i > 0 || j > 0) {
    const current = dp[i][j];

    if (current.from === 'diagonal' && i > 0 && j > 0) {
      const origWord = original[i - 1];
      const transWord = transcribed[j - 1];
      const similarity = similarityForPassageToken(origWord, transWord, isHindi);

      let status = 'correct';
      if (similarity >= correctThreshold) {
        status = 'correct';
      } else if (similarity >= weakThreshold) {
        status = 'incorrect';
      } else {
        status = 'incorrect';
      }

      alignment.unshift({
        original: origWord,
        transcribed: transWord,
        status,
        similarity: Math.round(similarity * 100)
      });
      i--;
      j--;
    } else if (current.from === 'up' && i > 0) {
      // Word in original but not transcribed (missing)
      alignment.unshift({
        original: original[i - 1],
        transcribed: '',
        status: 'missing',
        similarity: 0
      });
      i--;
    } else if (current.from === 'left' && j > 0) {
      // Word in transcribed but not in original (extra)
      alignment.unshift({
        original: '',
        transcribed: transcribed[j - 1],
        status: 'extra',
        similarity: 0
      });
      j--;
    } else {
      // Shouldn't happen, but break to avoid infinite loop
      break;
    }
  }

  const correctCount = alignment.filter(w => w.status === 'correct').length;
  const incorrectCount = alignment.filter(w => w.status === 'incorrect').length;
  const missingCount = alignment.filter(w => w.status === 'missing').length;
  const extraCount = alignment.filter(w => w.status === 'extra').length;

  console.log('Comparison results:', {
    correctCount,
    incorrectCount,
    missingCount,
    extraCount,
    total: alignment.length
  });

  return alignment;
};

function Assessment() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [language, setLanguage] = useState('english'); // 'english', 'hindi' or 'marathi'
  const [cards, setCards] = useState([]);
  const [assessmentType, setAssessmentType] = useState('word'); // 'word' or 'sentence'
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [countdown, setCountdown] = useState(15);
  const [showLanguageSelection, setShowLanguageSelection] = useState(true);

  // Audio visualization and guidance states
  const [showRecordingTips, setShowRecordingTips] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioQuality, setAudioQuality] = useState('good'); // 'good', 'fair', 'poor'
  const [, setAudioContext] = useState(null);
  const [, setAnalyser] = useState(null);

  // Comprehension assessment states
  const [assessmentStage, setAssessmentStage] = useState('paragraph'); // 'paragraph', 'answers', 'complete'
  const [paragraphAudio, setParagraphAudio] = useState(null);
  const [answerAudios, setAnswerAudios] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [comprehensionData, setComprehensionData] = useState(null);

  // ========== NEW FEATURES: Timer, Difficulty, Hints, Review, Bookmarks, Adaptive Difficulty ==========

  // Timer feature states
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [totalTimeLimit, setTotalTimeLimit] = useState(600); // 10 minutes in seconds
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [assessmentStartTime, setAssessmentStartTime] = useState(null);
  const [autoSubmitOnTimeout] = useState(true);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  // Difficulty mode states
  const [selectedDifficulty, setSelectedDifficulty] = useState('MEDIUM'); // 'EASY', 'MEDIUM', 'HARD'
  const [difficultySelection, setDifficultySelection] = useState(true);

  // Hints system states
  const [hintsAvailable] = useState(3); // Number of hints per assessment
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHint, setCurrentHint] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintQuestionIndex, setHintQuestionIndex] = useState(-1);
  const [hintHistory, setHintHistory] = useState([]);

  // Review mode states
  const [showReviewMode, setShowReviewMode] = useState(false);

  // Question bookmarking states
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState(new Set());
  const [filterBookmarkedOnly, setFilterBookmarkedOnly] = useState(false);

  // Adaptive difficulty states
  const [sessionAccuracy, setSessionAccuracy] = useState(0);
  const [sessionCorrectAnswers, setSessionCorrectAnswers] = useState(0);
  const [sessionTotalAnswers, setSessionTotalAnswers] = useState(0);
  const [suggestedDifficulty, setSuggestedDifficulty] = useState(null);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // ========== END NEW FEATURES ==========

  const getGroupsByLanguageAndStandard = (selectedLanguage, std) => {
    if (selectedLanguage === 'hindi') {
      if (std === '5') return grade5HindiComprehensionData.groups;
      if (std === '6') return grade6HindiComprehensionData.groups;
      if (std === '7') return grade7HindiComprehensionData.groups;
      return hindiAssessmentDataGroups[std] || hindiAssessmentDataGroups['1'];
    }

    if (selectedLanguage === 'marathi') {
      if (std === '5') return grade5MarathiComprehensionData.groups;
      if (std === '6') return grade6MarathiComprehensionData.groups;
      if (std === '7') return grade7MarathiComprehensionData.groups;
      return marathiAssessmentDataGroups[std] || marathiAssessmentDataGroups['1'];
    }

    if (selectedLanguage === 'science') {
      if (std === '1') return grade1ScienceData.groups;
      if (std === '2') return grade2ScienceData.groups;
      if (std === '3') return grade3ScienceData.groups;
      if (std === '4') return grade4ScienceData.groups;
      if (std === '5') return grade5ScienceData.groups;
      if (std === '6') return grade6ScienceData.groups;
      if (std === '7') return grade7ScienceData.groups;
      return assessmentDataGroups[std] || assessmentDataGroups.default;
    }

    if (selectedLanguage === 'maths') {
      return mathsAssessmentDataGroups[std] || mathsAssessmentDataGroups.default;
    }

    return assessmentDataGroups[std] || assessmentDataGroups.default;
  };

  const loadAssessmentData = (selectedLanguage, difficulty) => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const std = user.standard?.toString() || 'default';
    const groups = getGroupsByLanguageAndStandard(selectedLanguage, std);
    const selectedCards = getRandomGroup(groups);

    setAssessmentStage('paragraph');
    setParagraphAudio(null);
    setAnswerAudios([]);
    setCurrentQuestionIndex(0);
    setResults(null);
    setAudioBlob(null);
    setAudioUrl(null);
    setHintsUsed(0);
    setShowHint(false);
    setCurrentHint('');
    setHintQuestionIndex(-1);
    setHintHistory([]);
    setBookmarkedQuestions(new Set());

    if (selectedCards && selectedCards.length > 0 && selectedCards[0].type === 'comprehension') {
      const randomComprehension = selectedCards[Math.floor(Math.random() * selectedCards.length)];
      const difficultyVariant = getDifficultyVariant(randomComprehension, difficulty);
      difficultyVariant.questions = getQuestionsWithHints(difficultyVariant.questions || [], difficulty);
      setComprehensionData(difficultyVariant);
      setAssessmentType('comprehension');
      setCards([]);
      return;
    }

    if (selectedCards && selectedCards.type === 'comprehension') {
      const difficultyVariant = getDifficultyVariant(selectedCards, difficulty);
      difficultyVariant.questions = getQuestionsWithHints(difficultyVariant.questions || [], difficulty);
      setComprehensionData(difficultyVariant);
      setAssessmentType('comprehension');
      setCards([]);
      return;
    }

    const difficultyCards = getDifficultyVariant(selectedCards, difficulty);
    setCards(difficultyCards || selectedCards);
    setComprehensionData(null);
    if (selectedCards && selectedCards.length > 0) {
      setAssessmentType(selectedCards[0].type || 'word');
    }
  };

  const handleLanguageSelect = (selectedLanguage) => {
    setLanguage(selectedLanguage);
    setShowLanguageSelection(false);
    sessionStorage.setItem('assessmentLanguage', selectedLanguage);
    setDifficultySelection(true);
    loadAssessmentData(selectedLanguage, selectedDifficulty);
  };

  const handleStartAssessment = async () => {
    setDifficultySelection(false);
    setShowReviewMode(false);
    setSuggestedDifficulty(null);
    loadAssessmentData(language, selectedDifficulty);
    startTimer();

    try {
      const std = currentUser?.standard?.toString();
      if (!std) return;
      const response = await axios.get(`${API_URL}/timer-settings/${std}`);
      setTotalTimeLimit(response.data.timeLimit || 600);
      setTimeRemaining(response.data.timeLimit || 600);
      setTimerEnabled(Boolean(response.data.timerEnabled));
    } catch (error) {
      console.error('Failed to load timer settings:', error);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
  }, [navigate]);
  // Timer effect for timed assessments
  useEffect(() => {
    if (!timerEnabled || !assessmentStartTime) return;

    const timerInterval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;

        // Show warning at 1 minute remaining
        if (newTime === 60) {
          setShowTimeWarning(true);
        }

        // Auto-submit when time runs out
        if (newTime <= 0) {
          clearInterval(timerInterval);
          if (autoSubmitOnTimeout) {
            setHasTimedOut(true);
            setShowTimeWarning(false);
          }
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [timerEnabled, assessmentStartTime, autoSubmitOnTimeout]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hasTimedOut || isSubmitting) return;

    if (assessmentType === 'comprehension' && assessmentStage === 'answers') {
      if (paragraphAudio && answerAudios.length === (comprehensionData?.questions?.length || 0)) {
        submitComprehensionAssessment();
      } else {
        alert('Time is up. Please complete all recordings before submission.');
      }
    } else if (audioBlob) {
      submitAssessment();
    } else {
      alert('Time is up. Please record your response and submit.');
    }

    setHasTimedOut(false);
  }, [hasTimedOut, isSubmitting, assessmentType, assessmentStage, paragraphAudio, answerAudios, comprehensionData, audioBlob]);

  // Function to start timer
  const startTimer = () => {
    setAssessmentStartTime(Date.now());
    setTimeRemaining(totalTimeLimit);
    setTimerEnabled(true);
    setShowTimeWarning(false);
  };

  const saveAssessmentMetrics = async (scoreValue, totalQuestionsCount) => {
    try {
      const timeSpent = timerEnabled ? totalTimeLimit - timeRemaining : null;
      await axios.post(`${API_URL}/save-assessment-metrics`, {
        language,
        standard: currentUser.standard,
        difficulty: selectedDifficulty,
        score: scoreValue,
        timeSpent,
        hintsUsed,
        bookmarkedQuestions: Array.from(bookmarkedQuestions),
        assessmentType,
        totalQuestions: totalQuestionsCount
      });
    } catch (error) {
      console.error('Error saving assessment metrics:', error);
    }
  };

  const saveBookmarks = async () => {
    if (bookmarkedQuestions.size === 0) return;
    try {
      await axios.post(`${API_URL}/save-bookmarks`, {
        bookmarkedQuestions: Array.from(bookmarkedQuestions),
        assessmentId: `${language}-${Date.now()}`,
        language,
        standard: currentUser.standard
      });
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  };

  const trackPerformance = async (accuracy, correctAnswers, totalAnswers) => {
    try {
      const response = await axios.post(`${API_URL}/track-performance`, {
        accuracy,
        difficulty: selectedDifficulty,
        correctAnswers,
        totalAnswers,
        language,
        standard: currentUser.standard
      });

      const nextSuggested = recommendDifficulty(accuracy, selectedDifficulty);
      setSuggestedDifficulty(response.data?.suggestedDifficulty || nextSuggested);
      setSessionAccuracy(accuracy);
      setSessionCorrectAnswers(correctAnswers);
      setSessionTotalAnswers(totalAnswers);
    } catch (error) {
      console.error('Error tracking performance:', error);
    }
  };

  // Function to get hint for current question
  const getHint = (questionIndex, hintNumber) => {
    if (hintsUsed >= hintsAvailable) {
      return 'No more hints available!';
    }

    if (assessmentType === 'comprehension') {
      const question = comprehensionData?.questions?.[questionIndex] || null;
      if (!question || !question.answer) return 'No hint available for this question.';
      const answerText = question.answer.toString().trim();
      const normalizedHintNumber = Math.max(1, Math.min(hintsAvailable, hintNumber));
      const revealLength = Math.max(1, Math.ceil((answerText.length * normalizedHintNumber) / (hintsAvailable + 1)));
      return `Hint ${normalizedHintNumber}: the answer starts with "${answerText.substring(0, revealLength)}..."`;
    }

    const card = cards?.[questionIndex] || cards?.[0];
    if (!card) return 'No hint available.';

    const targetText = assessmentType === 'math' ? card.answer : (assessmentType === 'word' ? card.name : card.text);
    if (!targetText) return 'No hint available.';

    const firstWord = targetText.split(' ')[0];
    const normalizedHintNumber = Math.max(1, Math.min(hintsAvailable, hintNumber));
    if (normalizedHintNumber === 1) {
      return `Hint 1: start with "${firstWord.substring(0, 1)}".`;
    }
    if (normalizedHintNumber === 2) {
      return `Hint 2: begin with "${firstWord.substring(0, Math.min(3, firstWord.length))}".`;
    }
    return `Hint 3: read this part first — "${firstWord}".`;
  };

  // Function to reveal hint
  const revealHint = (questionIndex) => {
    if (hintsUsed < hintsAvailable) {
      const nextHintNumber = hintsUsed + 1;
      const hintText = getHint(questionIndex, nextHintNumber);

      setShowHint(true);
      setCurrentHint(hintText);
      setHintQuestionIndex(questionIndex);
      setHintHistory(prev => ([
        ...prev,
        {
          id: Date.now() + nextHintNumber,
          hintNumber: nextHintNumber,
          questionIndex,
          text: hintText
        }
      ]));
      setHintsUsed(nextHintNumber);
    }
  };

  // Function to toggle bookmark
  const toggleBookmark = (questionIndex) => {
    setBookmarkedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionIndex)) {
        newSet.delete(questionIndex);
      } else {
        newSet.add(questionIndex);
      }
      return newSet;
    });
  };

  const getPreferredRecorderMimeType = () => {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
      return '';
    }

    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4'
    ];

    return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || '';
  };

  const getAudioExtensionFromMimeType = (mimeType = '') => {
    const lowerMime = (mimeType || '').toLowerCase();
    if (lowerMime.includes('webm')) return 'webm';
    if (lowerMime.includes('ogg')) return 'ogg';
    if (lowerMime.includes('mp4') || lowerMime.includes('m4a')) return 'm4a';
    if (lowerMime.includes('mpeg') || lowerMime.includes('mp3')) return 'mp3';
    if (lowerMime.includes('wav')) return 'wav';
    return 'webm';
  };

  const appendAudioBlob = (formData, fieldName, blob, baseName) => {
    const extension = getAudioExtensionFromMimeType(blob?.type);
    formData.append(fieldName, blob, `${baseName}.${extension}`);
  };

  // Monitor audio levels for visualization
  const monitorAudioLevel = (audioAnalyser) => {
    const bufferLength = audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkLevel = () => {
      if (!audioAnalyser) return;

      audioAnalyser.getByteFrequencyData(dataArray);

      // Calculate average volume (RMS)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedLevel = Math.min(100, (average / 128) * 100);

      setAudioLevel(normalizedLevel);

      // Determine quality based on noise floor
      // If the level is consistently high (> 20) even when not speaking, it's noisy
      // This is a simple heuristic - in production you'd want more sophisticated detection
      if (normalizedLevel < 5) {
        setAudioQuality('good');
      } else if (normalizedLevel < 15) {
        setAudioQuality('fair');
      } else {
        setAudioQuality('poor');
      }

      requestAnimationFrame(checkLevel);
    };

    checkLevel();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      // Create audio context for visualization
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioAnalyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(audioAnalyser);
      audioAnalyser.fftSize = 256;

      setAudioContext(audioCtx);
      setAnalyser(audioAnalyser);

      // Start audio level monitoring
      monitorAudioLevel(audioAnalyser);

      const preferredMimeType = getPreferredRecorderMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          console.log(`Audio chunk received: ${e.data.size} bytes, total chunks: ${chunks.length}`);
        }
      };

      recorder.onstop = () => {
        console.log(`Recording stopped. Total chunks: ${chunks.length}`);
        const outputMimeType = recorder.mimeType || preferredMimeType || chunks[0]?.type || 'audio/webm';
        const blob = new Blob(chunks, { type: outputMimeType });
        console.log(`Final audio blob size: ${blob.size} bytes`);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());

        // Stop audio context
        if (audioCtx) {
          audioCtx.close();
        }
        setAudioLevel(0);
      };

      recorder.start(1000); // Capture chunks every 1000ms
      setMediaRecorder(recorder);
      setIsRecording(true);
      setCountdown(300); // 5 minutes = 300 seconds

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            if (recorder.state === 'recording') {
              recorder.stop();
              setIsRecording(false);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-stop after 5 minutes (300 seconds)
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          setIsRecording(false);
        }
        clearInterval(countdownInterval);
      }, 6000000);
    } catch (error) {
      alert('Could not access microphone. Please grant permission and try again.');
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  // Comprehension assessment recording functions
  const recordComprehensionAudio = async (onComplete) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      // Create audio context for visualization
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioAnalyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(audioAnalyser);
      audioAnalyser.fftSize = 256;

      setAudioContext(audioCtx);
      setAnalyser(audioAnalyser);
      monitorAudioLevel(audioAnalyser);

      const preferredMimeType = getPreferredRecorderMimeType();
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          console.log(`Answer audio chunk: ${e.data.size} bytes`);
        }
      };

      recorder.onstop = () => {
        console.log(`Answer recording stopped. Total chunks: ${chunks.length}`);
        const outputMimeType = recorder.mimeType || preferredMimeType || chunks[0]?.type || 'audio/webm';
        const blob = new Blob(chunks, { type: outputMimeType });
        console.log(`Answer audio blob size: ${blob.size} bytes`);
        stream.getTracks().forEach(track => track.stop());

        if (audioCtx) {
          audioCtx.close();
        }
        setAudioLevel(0);
        setIsRecording(false);
        setMediaRecorder(null);

        onComplete(blob);
      };

      recorder.start(1000); // Capture chunks every 1000ms
      setMediaRecorder(recorder);
      setIsRecording(true);
      setCountdown(300);

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            if (recorder.state === 'recording') {
              recorder.stop();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-stop after 5 minutes
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
        clearInterval(countdownInterval);
      }, 300000);
    } catch (error) {
      alert('Could not access microphone. Please grant permission and try again.');
      console.error('Error accessing microphone:', error);
    }
  };

  const recordParagraph = async () => {
    recordComprehensionAudio((blob) => {
      setParagraphAudio(blob);
      setAssessmentStage('answers'); // Go directly to answers
    });
  };

  const recordAnswer = async (questionIndex) => {
    recordComprehensionAudio((blob) => {
      const newAnswers = [...answerAudios];
      newAnswers[questionIndex] = blob;
      setAnswerAudios(newAnswers);

      // Move to next question or mark complete
      if (questionIndex < comprehensionData.questions.length - 1) {
        setCurrentQuestionIndex(questionIndex + 1);
      }
    });
  };

  const submitComprehensionAssessment = async () => {
    if (!paragraphAudio || answerAudios.length !== comprehensionData.questions.length) {
      alert('Please complete all recording stages!');
      return;
    }

    setIsSubmitting(true);

    const postWithRetry = async (url, data, config) => {
      try {
        return await axios.post(url, data, config);
      } catch (firstError) {
        // Retry once for transient/network failures where no HTTP response is available.
        if (!firstError.response) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          return await axios.post(url, data, config);
        }
        throw firstError;
      }
    };

    try {
      const formData = new FormData();
      appendAudioBlob(formData, 'paragraph_audio', paragraphAudio, 'paragraph');

      // No questions audio - students read questions silently

      // Add each answer audio
      answerAudios.forEach((audio, index) => {
        appendAudioBlob(formData, `answer_audio_${index}`, audio, `answer_${index}`);
      });

      formData.append('expected_paragraph', comprehensionData.paragraph);
      formData.append('expected_questions', JSON.stringify(comprehensionData.questions.map(q => q.text)));
      formData.append('expected_answers', JSON.stringify(comprehensionData.questions.map(q => q.answer)));
      formData.append('student_id', currentUser.id);
      formData.append('student_name', currentUser.name);
      formData.append('standard', currentUser.standard);
      formData.append('language', language);
      formData.append('time_spent_seconds', timerEnabled ? String(totalTimeLimit - timeRemaining) : '0');
      formData.append('hints_used', String(hintsUsed));
      formData.append('bookmarked_count', String(bookmarkedQuestions.size));

      const response = await postWithRetry(`${API_URL}/assess-comprehension`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResults(response.data);
      setAssessmentStage('complete');
      setTimerEnabled(false);

      const correctAnswers = response.data.correct_answers || response.data.answer_details?.filter(item => item.correct).length || 0;
      const totalAnswers = response.data.total_questions || comprehensionData.questions.length;
      const scoreValue = response.data.combined_score || 0;
      const accuracy = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;

      await saveAssessmentMetrics(scoreValue, totalAnswers);
      await saveBookmarks();
      await trackPerformance(accuracy, correctAnswers, totalAnswers);
    } catch (error) {
      console.error('Error processing comprehension assessment:', error);
      const serverMessage = error.response?.data?.error || error.response?.data?.message;
      const status = error.response?.status;

      if (status === 401) {
        alert('Session expired. Please log in again.');
      } else if (status === 403) {
        alert('You are not authorized to submit this assessment.');
      } else if (serverMessage) {
        alert(`Error processing assessment: ${serverMessage}`);
      } else {
        alert('Error processing assessment. Please check backend and Whisper services.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAssessment = async () => {
    if (!audioBlob) {
      alert('Please record your answer first!');
      return;
    }

    setIsSubmitting(true);

    const postWithRetry = async (url, data, config) => {
      try {
        return await axios.post(url, data, config);
      } catch (firstError) {
        // Retry once for transient/network failures where no HTTP response is available.
        if (!firstError.response) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          return await axios.post(url, data, config);
        }
        throw firstError;
      }
    };

    try {
      console.log('Submitting assessment with language:', language);
      const formData = new FormData();
      appendAudioBlob(formData, 'audio', audioBlob, 'recording');
      // Extract expected content based on assessment type
      const expectedContent = cards.map(c => assessmentType === 'math' ? c.answer : (assessmentType === 'word' ? c.name : c.text));
      formData.append('expected_words', JSON.stringify(expectedContent));
      formData.append('student_id', currentUser.id);
      formData.append('student_name', currentUser.name);
      formData.append('standard', currentUser.standard);
      formData.append('language', language);
      formData.append('time_spent_seconds', timerEnabled ? String(totalTimeLimit - timeRemaining) : '0');
      formData.append('hints_used', String(hintsUsed));
      formData.append('bookmarked_count', String(bookmarkedQuestions.size));
      console.log('Language parameter added to formData:', language);

      const response = await postWithRetry(`${API_URL}/assess`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResults(response.data);
      setTimerEnabled(false);

      const totalAnswers = response.data.details?.length || cards.length;
      const correctAnswers = response.data.details?.filter(item => item.correct).length || 0;
      const scoreValue = response.data.score || 0;
      const accuracy = totalAnswers > 0 ? correctAnswers / totalAnswers : 0;

      await saveAssessmentMetrics(scoreValue, totalAnswers);
      await trackPerformance(accuracy, correctAnswers, totalAnswers);
    } catch (error) {
      console.error('Error processing assessment:', error);
      const serverMessage = error.response?.data?.error || error.response?.data?.message;
      const status = error.response?.status;

      if (status === 401) {
        alert('Session expired. Please log in again.');
      } else if (status === 403) {
        alert('You are not authorized to submit this assessment.');
      } else if (serverMessage) {
        alert(`Error processing assessment: ${serverMessage}`);
      } else {
        alert('Error processing assessment. Please check backend and Whisper services.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const retry = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setResults(null);
    setShowReviewMode(false);
  };

  const getReviewData = () => {
    if (!results) {
      return {
        questions: [],
        answers: [],
        userAnswers: {},
        paragraph: ''
      };
    }

    if (assessmentType === 'comprehension' && comprehensionData) {
      const details = results.answer_details || [];
      const userAnswers = {};
      const evaluation = details.map((detail, index) => {
        userAnswers[index] = {
          isCorrect: detail.correct,
          userAnswer: detail.recognized || 'Not detected'
        };
        return { isCorrect: detail.correct };
      });

      return {
        questions: comprehensionData.questions || [],
        answers: evaluation,
        userAnswers,
        paragraph: comprehensionData.paragraph || ''
      };
    }

    const detailRows = results.details || [];
    const questions = detailRows.map((detail, index) => ({
      text: `Item ${index + 1}`,
      answer: detail.expected,
      hint: ''
    }));
    const userAnswers = {};
    const evaluation = detailRows.map((detail, index) => {
      userAnswers[index] = {
        isCorrect: detail.correct,
        userAnswer: detail.recognized || 'Not detected'
      };
      return { isCorrect: detail.correct };
    });

    return {
      questions,
      answers: evaluation,
      userAnswers,
      paragraph: ''
    };
  };

  const showScienceImages = language === 'science' && Number(currentUser?.standard) <= 4;

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="assessment-container">
      <div className="header">
        <h1>Learning Ability Assessment</h1>
        <div className="user-info">
          <span>Student: {currentUser.name}</span>
          <span>Standard: {currentUser.standard}</span>
          <Link to="/student-dashboard" className="dashboard-link">
            <i className="fas fa-chart-bar"></i> My Dashboard
          </Link>
        </div>
      </div>

      {/* Language Selection Screen */}
      {showLanguageSelection && (
        <div className="language-selection-overlay">
          <div className="language-selection-card">
            <h2><i className="fas fa-language"></i> Select Assessment Type</h2>
            <p className="language-subtitle">Choose the type or language for your assessment</p>
            <div className="language-options">
              <button 
                className="language-option english"
                onClick={() => handleLanguageSelect('english')}
              >
                <div className="language-icon">🇬🇧</div>
                <h3>English</h3>
                <p>Take assessment in English</p>
              </button>
              <button 
                className="language-option hindi"
                onClick={() => handleLanguageSelect('hindi')}
              >
                <div className="language-icon">🇮🇳</div>
                <h3>हिंदी (Hindi)</h3>
                <p>हिंदी में परीक्षण लें</p>
              </button>
              <button 
                className="language-option marathi"
                onClick={() => handleLanguageSelect('marathi')}
              >
                <div className="language-icon">🚩</div>
                <h3>मराठी (Marathi)</h3>
                <p>मराठीत परीक्षा द्या</p>
              </button>
              <button 
                className="language-option science"
                onClick={() => handleLanguageSelect('science')}
              >
                <div className="language-icon">🔬</div>
                <h3>Science</h3>
                <p>Science comprehension test</p>
              </button>
              <button 
                className="language-option maths"
                onClick={() => handleLanguageSelect('maths')}
              >
                <div className="language-icon">➗</div>
                <h3>Maths</h3>
                <p>Grade-wise math assessment</p>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="assessment-card">
        {suggestedDifficulty && results && (
          <div className="result-item" style={{ borderLeft: '4px solid #4caf50', marginBottom: '16px' }}>
            <div>
              <div className="result-label">Adaptive Suggestion</div>
              <div className="result-value">Try <strong>{suggestedDifficulty}</strong> difficulty in your next assessment.</div>
              <div className="result-similarity">
                Current session: {sessionCorrectAnswers}/{sessionTotalAnswers} correct ({Math.round(sessionAccuracy * 100)}% accuracy)
              </div>
            </div>
          </div>
        )}

        {!showLanguageSelection && difficultySelection && (
          <AssessmentFeatures
            timerEnabled={timerEnabled}
            timeRemaining={timeRemaining}
            showTimeWarning={showTimeWarning}
            hintsAvailable={hintsAvailable}
            hintsUsed={hintsUsed}
            onHintClick={() => revealHint(currentQuestionIndex)}
            selectedDifficulty={selectedDifficulty}
            onDifficultyChange={setSelectedDifficulty}
            bookmarkedCount={bookmarkedQuestions.size}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={comprehensionData?.questions?.length || cards.length}
            isBookmarked={bookmarkedQuestions.has(currentQuestionIndex)}
            onToggleBookmark={() => toggleBookmark(currentQuestionIndex)}
            difficultySelectionMode={difficultySelection}
            onStartAssessment={handleStartAssessment}
          />
        )}

        {!showLanguageSelection && !difficultySelection && (
          <AssessmentFeatures
            timerEnabled={timerEnabled}
            timeRemaining={timeRemaining}
            showTimeWarning={showTimeWarning}
            hintsAvailable={hintsAvailable}
            hintsUsed={hintsUsed}
            onHintClick={() => revealHint(currentQuestionIndex)}
            selectedDifficulty={selectedDifficulty}
            onDifficultyChange={setSelectedDifficulty}
            bookmarkedCount={bookmarkedQuestions.size}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={assessmentType === 'comprehension' ? (comprehensionData?.questions?.length || 0) : cards.length}
            isBookmarked={bookmarkedQuestions.has(currentQuestionIndex)}
            onToggleBookmark={() => toggleBookmark(currentQuestionIndex)}
            difficultySelectionMode={false}
            onStartAssessment={handleStartAssessment}
          />
        )}

        {!difficultySelection && showHint && (
          <div className="result-item" style={{ borderLeft: '4px solid #ffc107', marginBottom: '16px' }}>
            <div>
              <div className="result-label">💡 Active Hint {hintQuestionIndex >= 0 ? `(Q${hintQuestionIndex + 1})` : ''}</div>
              <div className="result-value">{currentHint}</div>
              {hintHistory.length > 1 && (
                <div style={{ marginTop: '10px' }}>
                  <div className="result-label">Hint History</div>
                  {hintHistory.map((entry) => (
                    <div key={entry.id} className="result-similarity">
                      Q{entry.questionIndex + 1} • Hint {entry.hintNumber}: {entry.text.replace(/^Hint \d+:\s*/, '')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showReviewMode && results && (
          <ReviewMode
            questions={getReviewData().questions}
            answers={getReviewData().answers}
            userAnswers={getReviewData().userAnswers}
            paragraph={getReviewData().paragraph}
            onClose={() => setShowReviewMode(false)}
          />
        )}

        {!difficultySelection && (
          <>
        {/* Comprehension Assessment UI */}
        {assessmentType === 'comprehension' && comprehensionData && (
          <>
            <div className="comprehension-header">
              <h2><i className="fas fa-book-open"></i> Reading Comprehension Assessment</h2>
              <div className="stage-progress">
                <div className={`stage-item ${assessmentStage === 'paragraph' ? 'active' : paragraphAudio ? 'complete' : ''}`}>
                  <span className="stage-number">1</span>
                  <span className="stage-label">Read Paragraph</span>
                </div>
                <div className={`stage-item ${assessmentStage === 'answers' ? 'active' : answerAudios.length > 0 ? 'complete' : ''}`}>
                  <span className="stage-number">2</span>
                  <span className="stage-label">Answer Questions</span>
                </div>
              </div>
            </div>

            {/* Stage 1: Read Paragraph */}
            {assessmentStage === 'paragraph' && !results && (
              <div className="comprehension-stage">
                <h3>{comprehensionData.title}</h3>
                
                {/* Science Diagram/Image */}
                {showScienceImages && comprehensionData.image && (
                  <div className="science-diagram-container">
                    <div className="diagram-frame">
                      <img 
                        src={comprehensionData.image} 
                        alt="Scientific diagram" 
                        className="science-diagram"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="diagram-placeholder" style={{display: 'none'}}>
                        <span className="placeholder-icon">🔬</span>
                        <span>Diagram Preview</span>
                      </div>
                    </div>
                    <div className="diagram-caption">
                      <span className="caption-icon">📊</span>
                      <span>Study the diagram above as you read</span>
                    </div>
                  </div>
                )}
                
                <div className="paragraph-display">
                  <div className="reading-instructions">
                    <span className="instruction-icon">📖</span>
                    <span>Read the passage aloud clearly</span>
                  </div>
                  <p>{comprehensionData.paragraph}</p>
                </div>

                {/* Audio Visualizer */}
                {isRecording && (
                  <div className="audio-visualizer">
                    <h4>Audio Level Monitor</h4>
                    <div className="level-meter">
                      <div
                        className={`level-bar ${audioQuality}`}
                        style={{ width: `${audioLevel}%` }}
                      ></div>
                    </div>
                    <div className={`quality-indicator ${audioQuality}`}>
                      {audioQuality === 'good' && '🟢 Excellent - Very quiet environment'}
                      {audioQuality === 'fair' && '🟡 Good - Some background noise detected'}
                      {audioQuality === 'poor' && '🔴 Poor - High background noise! Find a quieter place'}
                    </div>
                  </div>
                )}

                <div className="recording-controls">
                  {!paragraphAudio && !isRecording && (
                    <button onClick={recordParagraph} className="btn btn-primary">
                      <i className="fas fa-microphone"></i> Start Reading Paragraph
                    </button>
                  )}
                  {isRecording && (
                    <button onClick={stopRecording} className="btn btn-danger">
                      <i className="fas fa-stop"></i> Stop Recording ({countdown}s)
                    </button>
                  )}
                  {paragraphAudio && !isRecording && (
                    <div className="stage-complete">
                      <p>✓ Paragraph recorded successfully!</p>
                      <button onClick={() => setAssessmentStage('answers')} className="btn btn-success">
                        Continue to Answer Questions →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stage 2: Answer Questions (questions displayed for reference) */}
            {assessmentStage === 'answers' && !results && (
              <div className="comprehension-stage">
                <h3>📝 Answer the Questions</h3>
                <div className="question-instructions">
                  <div className="instruction-card">
                    <span className="instruction-number">1</span>
                    <span>Read each question carefully</span>
                  </div>
                  <div className="instruction-card">
                    <span className="instruction-number">2</span>
                    <span>Click the microphone to record</span>
                  </div>
                  <div className="instruction-card">
                    <span className="instruction-number">3</span>
                    <span>Say your answer in ONE word</span>
                  </div>
                </div>

                <div className="button-group" style={{ marginBottom: '16px' }}>
                  <button
                    onClick={() => setFilterBookmarkedOnly(prev => !prev)}
                    className="btn btn-primary"
                    type="button"
                  >
                    {filterBookmarkedOnly ? 'Show All Questions' : 'Show Bookmarked Only'}
                  </button>
                </div>

                {/* Show image reference during questions */}
                {showScienceImages && comprehensionData.image && (
                  <div className="reference-diagram">
                    <img src={comprehensionData.image} alt="Reference diagram" />
                    <span className="reference-label">Reference Diagram</span>
                  </div>
                )}

                <div className="answer-questions">
                  {comprehensionData.questions.map((q, idx) => {
                    if (filterBookmarkedOnly && !bookmarkedQuestions.has(idx)) {
                      return null;
                    }

                    return (
                    <div
                      key={idx}
                      className={`answer-item ${answerAudios[idx] ? 'answered' : ''} ${isRecording && currentQuestionIndex === idx ? 'recording' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Question ${idx + 1}. ${q.text}`}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setCurrentQuestionIndex(idx);
                        }
                      }}
                    >
                      <div className="question-number-badge">Q{idx + 1}</div>
                      <div className="question-content">
                        <div className="question-text">
                          {q.text}
                        </div>
                        {showHint && hintQuestionIndex === idx && (
                          <div className="result-item" style={{ margin: '10px 0', borderLeft: '4px solid #ffc107' }}>
                            <div>
                              <div className="result-label">Hint</div>
                              <div className="result-value">{currentHint}</div>
                            </div>
                          </div>
                        )}
                        <div className="answer-controls">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              setCurrentQuestionIndex(idx);
                              revealHint(idx);
                            }}
                            disabled={hintsUsed >= hintsAvailable}
                          >
                            💡 Hint
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              setCurrentQuestionIndex(idx);
                              toggleBookmark(idx);
                            }}
                          >
                            {bookmarkedQuestions.has(idx) ? '🔖 Bookmarked' : '📌 Bookmark'}
                          </button>
                          {!answerAudios[idx] && !isRecording && (
                            <button
                              onClick={() => recordAnswer(idx)}
                              className="btn btn-record"
                            >
                              <i className="fas fa-microphone"></i> Record Answer
                            </button>
                          )}
                          {isRecording && currentQuestionIndex === idx && (
                            <button onClick={stopRecording} className="btn btn-stop">
                              <i className="fas fa-stop-circle"></i> Stop ({countdown}s)
                            </button>
                          )}
                          {answerAudios[idx] && (
                            <div className="answer-status">
                              <i className="fas fa-check-circle"></i> Recorded
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>

                {/* Audio Visualizer during answer recording */}
                {isRecording && (
                  <div className="audio-visualizer">
                    <h4>Audio Level Monitor</h4>
                    <div className="level-meter">
                      <div
                        className={`level-bar ${audioQuality}`}
                        style={{ width: `${audioLevel}%` }}
                      ></div>
                    </div>
                    <div className={`quality-indicator ${audioQuality}`}>
                      {audioQuality === 'good' && <><i className="fas fa-circle" style={{color: '#4caf50'}}></i> Excellent - Very quiet environment</>}
                      {audioQuality === 'fair' && <><i className="fas fa-circle" style={{color: '#ff9800'}}></i> Good - Some background noise detected</>}
                      {audioQuality === 'poor' && <><i className="fas fa-circle" style={{color: '#f44336'}}></i> Poor - High background noise! Find a quieter place</>}
                    </div>
                  </div>
                )}

                {answerAudios.length === comprehensionData.questions.length && !isRecording && (
                  <div className="submit-section">
                    <button
                      onClick={submitComprehensionAssessment}
                      disabled={isSubmitting}
                      className="btn btn-success"
                    >
                      {isSubmitting ? '⏳ Processing...' : '✓ Submit Comprehension Assessment'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Results Display for Comprehension */}
            {results && assessmentType === 'comprehension' && (
              <div className="results-section">
                <h3><i className="fas fa-chart-bar"></i> Comprehension Assessment Results</h3>

                {/* Overall Score */}
                <div className="score-display">
                  <div className="score-circle">
                    <span className="score-value">{results.combined_score}%</span>
                    <span className="score-label">Overall Score</span>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="score-breakdown">
                  <div className="score-item">
                    <span className="score-label-text"><i className="fas fa-book-open"></i> Reading Score:</span>
                    <span className="score-value-text">{results.paragraph_score}%</span>
                  </div>
                  <div className="score-item">
                    <span className="score-label-text"><i className="fas fa-question-circle"></i> Answer Score:</span>
                    <span className="score-value-text">{results.answers_score}%</span>
                  </div>
                </div>

                {/* Paragraph Comparison */}
                <div className="passage-comparison-section">
                  <h4 style={{ textAlign: 'center', margin: '30px 0 20px', color: '#333' }}><i className="fas fa-book-open"></i> Passage Comparison</h4>
                  <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                    <span style={{ display: 'inline-block', margin: '0 10px' }}>
                      <span style={{ background: '#c8e6c9', padding: '3px 8px', borderRadius: '4px' }}>✓ Correct</span>
                    </span>
                    <span style={{ display: 'inline-block', margin: '0 10px' }}>
                      <span style={{ background: '#ffcdd2', padding: '3px 8px', borderRadius: '4px' }}>✗ Incorrect</span>
                    </span>
                    <span style={{ display: 'inline-block', margin: '0 10px' }}>
                      <span style={{ background: '#fff9c4', padding: '3px 8px', borderRadius: '4px' }}>⚠ Missing</span>
                    </span>
                  </p>

                  <div className="passage-comparison-container">
                    {/* Original Passage */}
                    <div className="passage-column">
                      <div className="passage-header">Original Passage</div>
                      <div className="passage-text">
                        {comparePassages(comprehensionData.paragraph, results.paragraph_transcribed).map((word, idx) => (
                          <span key={`orig-${idx}`} className={`word word-${word.status}`}>
                            {word.original}{' '}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Student's Reading */}
                    <div className="passage-column">
                      <div className="passage-header">What You Read</div>
                      <div className="passage-text">
                        {comparePassages(comprehensionData.paragraph, results.paragraph_transcribed).map((word, idx) => (
                          <span key={`trans-${idx}`} className={`word word-${word.status}`}>
                            {word.transcribed || '___'}{' '}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Reading Statistics */}
                  <div className="reading-statistics">
                    <div className="stat-item">
                      <span className="stat-label">Total Words:</span>
                      <span className="stat-value">{comparePassages(comprehensionData.paragraph, results.paragraph_transcribed).length}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Correct Words:</span>
                      <span className="stat-value correct">
                        {comparePassages(comprehensionData.paragraph, results.paragraph_transcribed).filter(w => w.status === 'correct').length}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Incorrect/Missing:</span>
                      <span className="stat-value incorrect">
                        {comparePassages(comprehensionData.paragraph, results.paragraph_transcribed).filter(w => w.status !== 'correct').length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Question Answer Details */}
                <div className="detailed-results">
                  <h4 style={{ marginTop: '30px' }}>❓ Questions & Answers Comparison</h4>
                  {results.answer_details?.map((detail, index) => (
                    <div
                      key={index}
                      className={`result-item scored ${Number(detail.similarity) >= 85 ? 'high-score' : Number(detail.similarity) >= 60 ? 'mid-score' : 'low-score'}`}
                    >
                      <div style={{ flex: 1 }}>
                        <div className="result-label" style={{ fontSize: '16px', marginBottom: '8px' }}>
                          Q{index + 1}: {comprehensionData.questions[index].text}
                        </div>
                        <div className="result-value" style={{ fontSize: '15px' }}>
                          <strong>Expected:</strong> {detail.expected} | <strong>Your Answer:</strong> {detail.recognized || 'Not detected'}
                        </div>
                        <div className="result-similarity">
                          Answer Score: {detail.similarity}%
                        </div>
                      </div>
                      <div className="result-icon score-badge" style={{ fontSize: '18px' }}>
                        {detail.similarity}%
                      </div>
                    </div>
                  ))}
                </div>

                {/* Average Scores Summary */}
                <div className="average-scores-summary">
                  <h4 className="performance-summary-heading"><i className="fas fa-chart-line"></i> Performance Summary</h4>
                  <div className="summary-grid">
                    <div className="summary-card">
                      <div className="summary-icon"><i className="fas fa-book-open"></i></div>
                      <div className="summary-title">Average Reading Score</div>
                      <div className="summary-value">{results.paragraph_score}%</div>
                      <div className="summary-description">Accuracy in reading the passage</div>
                    </div>
                    <div className="summary-card">
                      <div className="summary-icon"><i className="fas fa-question-circle"></i></div>
                      <div className="summary-title">Average Answer Score</div>
                      <div className="summary-value">{results.answers_score}%</div>
                      <div className="summary-description">{results.correct_answers} out of {results.total_questions} questions correct</div>
                    </div>
                    <div className="summary-card highlight">
                      <div className="summary-icon"><i className="fas fa-bullseye"></i></div>
                      <div className="summary-title">Combined Average</div>
                      <div className="summary-value">{results.combined_score}%</div>
                      <div className="summary-description">Overall performance score</div>
                    </div>
                  </div>
                </div>

                <div className="results-actions">
                  <button onClick={() => window.location.reload()} className="btn btn-primary">
                    Try Another Assessment
                  </button>
                  <button onClick={() => setShowReviewMode(true)} className="btn btn-success">
                    Open Review Mode
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Regular Assessment UI (word/sentence/paragraph) */}
        {assessmentType !== 'comprehension' && (
          <>
            <div className="instructions">
              <h2>
                {assessmentType === 'math' ? 'Answer the Math Questions' :
                  assessmentType === 'word' ? 'Identify and Say the Names' :
                  assessmentType === 'paragraph' ? 'Read the Paragraph Carefully' :
                    'Read the Sentences'}
              </h2>
              <p>
                {assessmentType === 'math' ? 'Read each question and say the answer clearly.' :
                  assessmentType === 'word' ? 'Look at each picture and say its name clearly.' :
                  assessmentType === 'paragraph' ? 'Read the entire paragraph slowly and clearly. Take your time to understand the meaning.' :
                    'Read each sentence clearly and carefully.'}
              </p>
            </div>

            <div className="cards-container">
              {cards.map((card, index) => (
                <div
                  key={index}
                  className={`card-item ${assessmentType === 'sentence' || assessmentType === 'paragraph' ? 'sentence-card' : ''} ${results?.details[index]?.correct ? 'correct' : results?.details[index]?.correct === false ? 'incorrect' : ''}`}
                >
                  {assessmentType !== 'math' && (
                    <img
                      src={card.image}
                      alt={assessmentType === 'word' ? card.name : card.text}
                      className="card-image"
                      onError={(e) => e.target.src = `https://via.placeholder.com/150?text=${assessmentType === 'word' ? card.name : 'Read'}`}
                    />
                  )}
                  <div className={assessmentType === 'word' ? 'card-name' : 'card-sentence'}>
                    {assessmentType === 'math' ? card.question : (assessmentType === 'word' ? card.name : card.text)}
                  </div>
                </div>
              ))}
            </div>

            {!results && (
              <>
                {/* Recording Tips Modal */}
                {showRecordingTips && (
                  <div className="recording-tips-modal">
                    <div className="tips-content">
                      <h3>📋 Recording Tips for Best Results</h3>
                      <ul className="tips-list">
                        <li>✓ Find a quiet room away from noise</li>
                        <li>✓ Close windows and doors</li>
                        <li>✓ Turn off fans, AC, or background music</li>
                        <li>✓ Speak clearly, 6-12 inches from microphone</li>
                        <li>✓ Avoid rustling papers or moving objects</li>
                        <li>✓ Check the audio level indicator below</li>
                      </ul>
                      <button
                        onClick={() => setShowRecordingTips(false)}
                        className="btn btn-primary"
                      >
                        Got it, let's start!
                      </button>
                    </div>
                  </div>
                )}

                {/* Audio Level Visualizer */}
                {isRecording && (
                  <div className="audio-visualizer">
                    <h4>Audio Level Monitor</h4>
                    <div className="level-meter">
                      <div
                        className={`level-bar ${audioQuality}`}
                        style={{ width: `${audioLevel}%` }}
                      ></div>
                    </div>
                    <div className={`quality-indicator ${audioQuality}`}>
                      {audioQuality === 'good' && '🟢 Excellent - Very quiet environment'}
                      {audioQuality === 'fair' && '🟡 Good - Some background noise detected'}
                      {audioQuality === 'poor' && '🔴 Poor - High background noise! Find a quieter place'}
                    </div>
                  </div>
                )}

                <div className="recording-section">
                  <div className="recording-status">
                    <span className={`status-dot ${isRecording ? 'recording' : ''}`}></span>
                    <span className="status-text">
                      {isRecording ? `Recording in progress... ${countdown}s` : audioBlob ? 'Recording complete. Ready to submit.' : 'Ready to record'}
                    </span>
                  </div>

                  <div className="button-group">
                    <button
                      onClick={startRecording}
                      disabled={isRecording || audioBlob}
                      className="btn btn-primary"
                    >
                      🎤 Start Recording
                    </button>

                    <button
                      onClick={stopRecording}
                      disabled={!isRecording}
                      className="btn btn-danger"
                    >
                      <i className="fas fa-stop"></i> Stop Recording
                    </button>

                    <button
                      onClick={submitAssessment}
                      disabled={!audioBlob || isSubmitting}
                      className="btn btn-success"
                    >
                      {isSubmitting ? '⏳ Processing...' : '✓ Submit Assessment'}
                    </button>
                  </div>
                </div>

                {audioUrl && (
                  <div className="audio-preview">
                    <h3>Your Recording:</h3>
                    <audio src={audioUrl} controls />
                  </div>
                )}
              </>
            )}

            {results && (
              <div className="results-section">
                <h3>Assessment Results</h3>
                <div className="score-display">
                  <div className="score-circle">
                    <span className="score-value">{results.score}%</span>
                    <span className="score-label">Score</span>
                  </div>
                </div>

                <div className="detailed-results">
                  <h4>Word by Word Analysis:</h4>
                  {results.details.map((detail, index) => (
                    <div key={index} className={`result-item ${detail.correct ? 'correct' : 'incorrect'}`}>
                      <div>
                        <div className="result-label">Expected: {detail.expected}</div>
                        <div className="result-value">Recognized: {detail.recognized || 'Not detected'}</div>
                        {detail.similarity !== undefined && (
                          <div className="result-similarity">Similarity: {detail.similarity}%</div>
                        )}
                      </div>
                      <div className="result-icon">{detail.correct ? '✓' : '✗'}</div>
                    </div>
                  ))}
                </div>

                <button onClick={retry} className="btn btn-primary">
                  Try Again
                </button>
                <button onClick={() => setShowReviewMode(true)} className="btn btn-success" style={{ marginLeft: '10px' }}>
                  Open Review Mode
                </button>
              </div>
            )}
          </>
        )}
          </>
        )}
      </div>
    </div>
  );
}

export default Assessment;
