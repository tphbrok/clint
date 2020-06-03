import { isEmptyObject } from "./utils/isEmptyObject";

interface ICommand {
  command: string
  action: Function
}

interface IOption {
  name: string
  type: string
  alias?: string
}

interface IOptionValues {
  [key: string]: string | number | boolean
}

class Command implements ICommand {
  public command: string
  public options: IOption[]
  public action: (...commandOptions: any[]) => void

  constructor(
    command: string,
    action: (...commandOptions: any[]) => void,
    options?: IOption[]
  ) {
    this.command = command
    this.options = options || []
    this.action = action
  }
}

export default class Clint {
  public name: string
  public commands: Command[]
  public args: string[]

  private bin: string

  /**
   * Creates a new command parser.
   * @param name - Name of the parser, which is used as the name for the executable bin file.
   * @constructor
   */
  constructor(name: string) {
    this.name = name
    this.commands = []
    this.args = process.argv.slice(2)

    const splittedArvg1 = process.argv[1].split(/\//g)

    this.bin = splittedArvg1[splittedArvg1.length - 1]
  }

  private getOption = (command: Command, optionName: string): IOption =>
    command.options.filter(
      (option) => option.name === optionName || option.alias === optionName
    )[0] || {}

  private splitMergedAliasFlags = (args: string[]): string[] => {
    let splittedArgs: string[] = []

    args.forEach((arg) => {
      if (arg.startsWith(`-`) && !arg.startsWith(`--`)) {
        splittedArgs.push(
          ...arg
            .replace(`-`, ``)
            .split(``)
            .map((a) => `-${a}`)
        )
      } else {
        splittedArgs.push(arg)
      }
    })

    return splittedArgs
  }

  private transformAliasFlags = (
    args: string[],
    availableOptions: IOption[]
  ): string[] => {
    return args.map((arg) => {
      if (arg.startsWith(`-`) && !arg.startsWith(`--`)) {
        const matchingOptions = availableOptions.filter(
          (option) => `-${option.alias}` === arg
        )

        if (matchingOptions.length > 0) {
          return `--${matchingOptions[0].name}`
        } else {
          return arg
        }
      } else {
        return arg
      }
    })
  }

  private parseArguments = (args: string[], availableOptions: IOption[]) =>
    this.transformAliasFlags(this.splitMergedAliasFlags(args), availableOptions)

  private validateArguments = (
    args: string[],
    availableOptions: IOption[]
  ): string => {
    for (let argIndex = 0; argIndex < args.length; argIndex++) {
      const arg = args[argIndex]

      const matchingOptions = availableOptions.filter(
        (option) => `--${option.name}` === arg
      )

      if (matchingOptions.length > 0) {
        const matchingOption = matchingOptions[0]

        if (
          matchingOption.type === `string` &&
          args[argIndex + 1].startsWith(`-`)
        ) {
          return `Parsing error: option --${matchingOption.name}${
            matchingOption.alias ? `|-${matchingOption.alias}` : ``
          } expects a value.`
        }
      }
    }

    return ``
  }

  private validateOptions = (options: IOption[]): string => {
    for (let index = 0; index < options.length; index++) {
      const option = options[index]

      if (option.alias && option.alias.length > 1) {
        return `Parser initalization error: option alias must be a single alphanumeric character. Received alias '-${option.alias}' for option '--${option.name}'.`
      }
    }

    return ``
  }

  /**
   * Adds a command listener to the parser.
   * @param command - Name of the command.
   * @param options - Array of options to include with the command.
   * @param action  - Callback function to execute upon receiving the command, accepting
   *                  an object with fully specified option names as an argument (to be
   *                  used in the callback).
   */
  public command(
    command: string,
    options: IOption[],
    action: (optionValues: IOptionValues) => void
  ): Clint {
    this.commands.push(new Command(command, action, options))

    return this
  }

  /**
   * Prompts a question to the user.
   * @param question - Question to be answered.
   * @param callback - Callback function to execute upon confirming the answer, accepting `answer` as an argument containing the user input.
   */
  public ask(question: string, callback: (answer: string) => void) {
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

  /**
   * Parses all arguments, validates options and arguments, and executes callback of command corresponding to the arguments when possible.
   */
  public parse() {
    const currentCommand = this.commands.filter(
      ({ command }) => command.split(/\s/)[0] === this.args[0]
    )

    if (currentCommand.length > 0) {
      const command = currentCommand[0]
      const args = this.args.slice(1)
      const optionValues: IOptionValues = {}
      const parsedArguments: string[] = this.parseArguments(
        args,
        command.options
      )
      const optionError = this.validateOptions(command.options)
      const argumentError = this.validateArguments(
        parsedArguments,
        command.options
      )

      if (optionError.length > 0) {
        console.error(optionError)
      } else if (argumentError.length > 0) {
        console.error(argumentError)
      } else {
        for (let i = 0; i < parsedArguments.length; i++) {
          const arg = parsedArguments[i]
          const optionName = arg.slice(2)
          const option = this.getOption(command, optionName)

          if (!isEmptyObject(option)) {
            switch (option.type) {
              case `string` || `number`:
                optionValues[optionName] = parsedArguments[i + 1]
                break
              case `boolean`:
                optionValues[optionName] = true
                break
              default:
                break
            }
          }
        }

        command.action(optionValues)
      }
    } else {
      process.stdout.write(
        `Unknown command '${this.args[0]}'.\n\nExecute '${this.bin} help' to view all available commands.\n`
      )
    }
  }
}
