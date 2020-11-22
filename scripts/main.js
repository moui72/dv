class Breed {
    constructor(name) {
        this.minimumBufferSize = 5
        this.name = name
        this.buffer = new Set()
        this.archive = new Set()
        this.browserEntry = undefined
        this.opt = undefined
    }

    initialize() {
        return this.getDogs(10).then(dogs => {
            for (const dogSrc of dogs) {
                const dog = new Dog(this, dogSrc)
                if (!this.archive.has(dog) && this.activeDog != dog) {
                    this.buffer.add(dog)
                }
            }
            this.browserEntry = document.createElement("li")
            const text = document.createElement("span")
            text.innerHTML = this.name
            const exemplarDog = this.buffer.values().next().value
            this.browserEntry.appendChild(exemplarDog.thumbnail)
            this.browserEntry.appendChild(text)
            this.browserEntry.onclick = () => (app.setActiveBreed(this.name))
            this.browserEntry.style = "cursor: pointer"
            const opt = document.createElement("option")
            opt.value = this.name
            opt.text = this.name
            // TODO maybe make this dynamic/configurable
            opt.selected = this.name == "shiba"
            this.opt = opt
            return this.nextDog()
        })
    }

    nextDog() {
        let dog = this.buffer.values().next().value
        if (!dog) {
            dog = this.archive.values().next().value
            if (!dog) {
                throw new Error(`No ${this.name}s!`)
            } else {
                console.log(`Repeated ${this.name}`)
            }
        }

        this.buffer.delete(dog)
        this.activeDog = dog
        if (this.buffer.size < this.minimumBufferSize) {
            this.getDogs(this.name, 10).then(dogs => {
                for (const dogSrc of dogs) {
                    const dog = new Dog(this, dogSrc)
                    if (!this.archive.has(dog) && this.activeDog != dog) {
                        this.buffer.add(dog)
                    }
                }
            })
        }
        return dog
    }

    getDogs(number = 1) {
        return window.fetch(
            `https://dog.ceo/api/breed/${this.name.split("-").join("/")}/images/random/${number}`
        )
            .then(response => response.json())
            .then(json => {
                if (json.status == "success") {
                    return json.message
                }
            })
    }
}

class App {
    constructor() {
        this.breeds = {}
        this.activeBreed = undefined
        this.display = document.getElementById("mainDisplay")
        this.button = document.getElementById("showDog")
        this.el = document.getElementById("app")
        this.loader = document.getElementById("loading")
        this.archive = document.getElementById("archive")
        this.archiveWrapper = document.getElementById("archiveWrapper")
        this.numberOfBreeds = Infinity
        this.selector = document.getElementById("pickBreed")
        this.breedBrowser = document.getElementById("breedBrowser")
        this.breedBrowserWrapper = document.getElementById("browserWrapper")


        window.fetch("https://dog.ceo/api/breeds/list/all")
            .then(response => { return response.json() })
            .then(responseJson => {
                if (responseJson.status == "success") {
                    const breeds = responseJson.message
                    this.numberOfBreeds = Object.keys(breeds).reduce((count, breed) => {
                        count += breeds[breed].length || 1
                        return count
                    }, 0)
                    for (const breed in breeds) {
                        if (breeds[breed].length) {
                            for (const subBreed of breeds[breed]) {
                                this.initializeBreed(`${breed}-${subBreed}`)
                            }
                        } else {
                            this.initializeBreed(breed)
                        }
                    }
                } else {
                    this.die(new Error("API request was not successful"))
                }
            }, e => this.die(e)
            )
    }

    initializeBreed(name) {
        const breed = new Breed(name)
        try {
            breed.initialize().then(() => {
                this.breeds[name] = breed
                this.initialized(breed)
            })
        } catch (e) {
            console.log(e)
        }
    }

    initialized(breed) {
        if (Object.keys(this.breeds).length >= this.numberOfBreeds) {
            const breedsInOrder = Object.keys(this.breeds).sort()
            breedsInOrder.forEach(breed => {
                this.selector.appendChild(this.breeds[breed].opt)
                this.breedBrowser.appendChild(this.breeds[breed].browserEntry)
            })
            this.setActiveBreed("shiba")
            this.loader.hidden = true
            this.el.hidden = false
        } else {
            const percentComplete = Math.round(
                Object.keys(this.breeds).length / this.numberOfBreeds * 100
            )
            this.loader.innerText = `Loading... (${percentComplete} %)`
        }
    }

    die(e) {
        const errorMessage = document.createElement("p")
        errorMessage.innerHTML = e ? e.message : "Error"
        document.getElementById("body").appendChild(errorMessage)
    }

    setActiveBreed(breedName) {
        this.clear(this.display)
        this.hideHistory()
        this.hideBrowse()
        this.activeBreed = this.breeds[breedName]
        this.button.innerHTML = `Show me another cute ${breedName}!`
        const dog = this.activeBreed.activeDog
        this.showDog(dog)
    }

    showDog(dog) {
        this.display.clearDisplay
        this.display.appendChild(dog.img)
        this.display.appendChild(dog.caption)
        return dog
    }

    newDog() {
        this.hideBrowse()
        this.hideHistory()
        this.activeBreed.activeDog.archive()
        this.clear(this.display)
        const newDog = this.activeBreed.nextDog()
        this.showDog(newDog)
    }

    clear(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild)
        }
    }

    showBrowse() {
        this.breedBrowserWrapper.hidden = false
    }

    hideBrowse() {
        this.breedBrowserWrapper.hidden = true
    }

    showHistory() {
        this.clear(this.archive)
        for (const dog of this.activeBreed.archive.values()) {
            this.archive.appendChild(dog.img)
        }
        if (!this.archive.hasChildNodes()) {
            const par = document.createElement("p")
            par.innerText = "No history yet"
            this.archive.appendChild(par)
        }
        this.archiveWrapper.hidden = false
    }

    hideHistory() {
        this.archiveWrapper.hidden = true
    }
}

class Dog {
    constructor(breed, imgSrc) {
        this.breed = breed
        this.description = `an adorable ${this.breed.name}`
        this.img = new Image()
        this.img.src = imgSrc
        this.img.alt = this.description
        this.img.style = "max-height: 400px"
        this.thumbnail = this.img.cloneNode()
        this.thumbnail.style = "max-height: 80px; display: inline-block"
        this.caption = document.createElement("figcaption")
        this.caption.innerText = this.description
    }

    archive() {
        this.breed.archive.add(this)
    }

}

app = new App()