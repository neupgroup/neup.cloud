export const dictionaryWords = [
    'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet',
    'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango',
    'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu', 'apple', 'banana', 'cherry', 'date',
    'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine', 'orange',
    'papaya', 'quince', 'raspberry', 'strawberry', 'tangerine', 'ugli', 'vanilla', 'watermelon',
    'apricot', 'blackberry', 'coconut', 'dragonfruit', 'eggplant', 'fennel', 'garlic', 'jalapeno',
    'kale', 'lettuce', 'mushroom', 'onion', 'parsley', 'quinoa', 'radish', 'spinach', 'tomato',
    'yam', 'zucchini', 'badger', 'bear', 'beaver', 'bison', 'camel', 'cat', 'cheetah', 'cobra',
    'cougar', 'coyote', 'crane', 'crow', 'deer', 'dog', 'dolphin', 'dove', 'duck', 'eagle',
    'ferret', 'fox', 'frog', 'goat', 'goose', 'hawk', 'lion', 'lizard', 'llama', 'monkey',
    'moose', 'mouse', 'mule', 'newt', 'otter', 'owl', 'panda', 'parrot', 'peacock', 'penguin',
    'pig', 'pigeon', 'pony', 'puma', 'rabbit', 'raccoon', 'ram', 'rat', 'raven', 'seal',
    'shark', 'sheep', 'skunk', 'sloth', 'snake', 'spider', 'stork', 'swan', 'tiger', 'toad',
    'trout', 'turkey', 'turtle', 'weasel', 'whale', 'wolf', 'wombat', 'zebra', 'potato', 'couch',
    'sofa', 'chair', 'table', 'lamp', 'desk', 'bed', 'closet', 'shelf', 'mirror', 'rug',
    'curtain', 'pillow', 'blanket', 'sheet', 'towel', 'soap', 'shampoo', 'brush', 'comb', 'razor',
    'oven', 'stove', 'fridge', 'freezer', 'toaster', 'blender', 'mixer', 'whisk', 'spoon', 'fork',
    'knife', 'plate', 'bowl', 'mug', 'cup', 'glass', 'pan', 'pot', 'lid', 'opener', 'peeler',
    'grater', 'strainer', 'funnel', 'tray', 'bucket', 'mop', 'broom', 'dustpan', 'vacuum', 'iron',
    'board', 'washer', 'dryer', 'basket', 'bag', 'box', 'can', 'jar', 'bottle', 'tub', 'sink'
];

export function getRandomWord() {
    return dictionaryWords[Math.floor(Math.random() * dictionaryWords.length)];
}
