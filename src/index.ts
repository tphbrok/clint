interface ICommand {
  command: string
  action: Function
}

class Command implements ICommand {
  public command: string
  public action: (...commandArguments: any[]) => void

  constructor(command: string, action: (...commandArguments: any[]) => void) {
    this.command = command
    this.action = action
  }
}

export class Clint {
  public name: string
  public commands: Command[]
  public args: string[]

  private bin: string

  constructor(name: string) {
    this.name = name
    this.commands = []
    this.args = process.argv.slice(2)

    const splittedArvg1 = process.argv[1].split(/\//g)

    this.bin = splittedArvg1[splittedArvg1.length - 1]
  }

  command(
    command: string,
    action: (...commandArguments: any[]) => void
  ): Clint {
    this.commands.push(new Command(command, action))

    return this
  }

  ask(question: string, callback: (answer: string) => void) {
    process.stdout.write(`${question}\n► `)

    process.stdin.setEncoding("utf8").on("readable", () => {
      let chunk

      while ((chunk = process.stdin.read()) !== null) {
        const newLineDetectionRegex = new RegExp(/.*\n|.*\r|.*\r\n|.*\x0A/gi)
        const newLineRegex = new RegExp(/\n|\r|\r\n|\x0A/g)

        if (newLineDetectionRegex.test(chunk)) {
          callback(chunk.replace(newLineRegex, ``))
          break
        }
      }
    })
  }

  parse() {
    const currentCommand = this.commands.filter(
      ({ command }) => command.split(/\s/)[0] === this.args[0]
    )

    if (currentCommand.length > 0) {
      currentCommand[0].action(...this.args.slice(1))
    } else {
      process.stdout.write(
        `Unknown command '${this.args[0]}'. Type '${this.bin} help' to view all available commands.\n`
      )
    }
  }
}
