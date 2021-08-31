import {
    ExcludeByValue,
    FilterByValue,
    Narrow,
    Exact,
    NonRecursible
} from "@re-do/utils"
import { TypeError, ForceEvaluate } from "./utils"

type BuiltInTypes = {
    string: string
    boolean: boolean
    number: number
    null: null
    undefined: undefined
    unknown: unknown
    any: any
}

type BuiltInPropDef = keyof BuiltInTypes

type AtomicPropDef<DefinedTypeName extends string> =
    | DefinedTypeName
    | BuiltInPropDef

type ListPropDef<ListItem extends string = string> = `${ListItem}[]`

type OrPropDef<
    First extends string = string,
    Second extends string = string
> = `${First} | ${Second}`

type PropDefGroup<Group extends string = string> = `(${Group})`

type OptionalPropDef<OptionalType extends string = string> = `${OptionalType}?`

type ValidatedPropDefRecurse<
    DefinedTypeName extends string,
    Fragment extends string
> = Fragment extends PropDefGroup<infer Group>
    ? `(${ValidatedPropDefRecurse<DefinedTypeName, Group>})`
    : Fragment extends ListPropDef<infer ListItem>
    ? `${ValidatedPropDefRecurse<DefinedTypeName, ListItem>}[]`
    : Fragment extends OrPropDef<infer First, infer Second>
    ? `${ValidatedPropDefRecurse<
          DefinedTypeName,
          First
      >} | ${ValidatedPropDefRecurse<DefinedTypeName, Second>}`
    : Fragment extends AtomicPropDef<DefinedTypeName>
    ? Fragment
    : TypeError<`Unable to determine the type of '${Fragment}'.`>

type ValidatedMetaPropDef<
    DefinedTypeName extends string,
    PropDef extends string
> = PropDef extends OptionalPropDef<infer OptionalType>
    ? `${ValidatedPropDefRecurse<DefinedTypeName, OptionalType>}?`
    : ValidatedPropDefRecurse<DefinedTypeName, PropDef>

export type ValidatedPropDef<
    DefinedTypeName extends string,
    PropDef extends string
> = ValidatedMetaPropDef<DefinedTypeName, PropDef>

export type NonStringOrRecord = Exclude<NonRecursible | any[], string>

// Check for all non-object types other than string (which are illegal) as validating
// that Definition[PropName] extends string directly results in type widening
type TypeDefinitionRecurse<TypeSet, Definition> = {
    [PropName in keyof Definition]: Definition[PropName] extends NonStringOrRecord
        ? TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>
        : Definition[PropName] extends object
        ? Exact<
              Definition[PropName],
              TypeDefinitionRecurse<TypeSet, Definition[PropName]>
          >
        : ValidatedPropDef<
              keyof TypeSet & string,
              Definition[PropName] & string
          >
}

export type TypeDefinition<TypeSet, Definition> = Definition extends string
    ? ValidatedPropDef<keyof TypeSet & string, Definition & string>
    : TypeDefinitionRecurse<TypeSet, Definition>

export type DefinedTypeSet<Definitions> = TypeDefinitionRecurse<
    Definitions,
    Definitions
>

type ParseTypeString<
    Definitions,
    PropDefinition extends string
> = PropDefinition extends OptionalPropDef<infer OptionalType>
    ? ParseTypeStringRecurse<Definitions, OptionalType> | undefined
    : ParseTypeStringRecurse<Definitions, PropDefinition>

type ParseTypeStringRecurse<
    Definitions,
    PropDefinition extends string
> = PropDefinition extends PropDefGroup<infer Group>
    ? ParseTypeStringRecurse<Definitions, Group>
    : PropDefinition extends ListPropDef<infer ListItem>
    ? ParseTypeStringRecurse<Definitions, ListItem>[]
    : PropDefinition extends OrPropDef<infer First, infer Second>
    ?
          | ParseTypeStringRecurse<Definitions, First>
          | ParseTypeStringRecurse<Definitions, Second>
    : PropDefinition extends keyof Definitions
    ? ParseType<Definitions, Definitions[PropDefinition]>
    : PropDefinition extends keyof BuiltInTypes
    ? BuiltInTypes[PropDefinition]
    : TypeError<`Unable to parse the type of '${PropDefinition}'.`>

export type ParseTypes<Definitions> = {
    [TypeName in keyof Definitions]: ParseType<
        Definitions,
        Definitions[TypeName]
    >
}

export type ParseType<Definitions, Definition> = Definition extends string
    ? ForceEvaluate<ParseTypeString<Definitions, Definition>, false>
    : Definition extends object
    ? ForceEvaluate<ParseTypeObject<Definitions, Definition>, false>
    : TypeError<`A type definition must be an object whose keys are either strings or nested type definitions.`>

type ParseTypeObject<Definitions, Definition> = {
    [PropName in keyof ExcludeByValue<
        Definition & object,
        OptionalPropDef
    >]: ParseType<Definitions, Definition[PropName]>
} &
    {
        [PropName in keyof FilterByValue<
            Definition & object,
            OptionalPropDef
        >]?: Definition[PropName] extends OptionalPropDef<infer OptionalType>
            ? ParseType<Definitions, OptionalType>
            : TypeError<`Expected property ${PropName &
                  (string | number)} to be optional.`>
    }

const getTypes = <Definitions extends DefinedTypeSet<Definitions>>(
    t: Narrow<Definitions>
) => "" as any as ParseTypes<Definitions>

getTypes({
    user: {
        name: "string",
        bestFriend: "user",
        friends: "user[]",
        groups: "group[]",
        nested: {
            another: "string",
            user: "user[]"
        }
    },
    group: {
        name: "string",
        description: "string?",
        members: "user[]",
        owner: "user"
    }
}).group.owner.nested.another