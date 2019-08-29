import React, { ReactNode, useState } from "react"
import useForm, { FormContext } from "react-hook-form"
import { FormActions, Fields } from "./FormContext"
import { ResponseState } from "../responses"
import { FormErrors } from "../forms"
import { plainToClassFromExist } from "class-transformer"
import { validateSync } from "class-validator"

export type FormProps<T extends Fields, D = any> = FormActions<T, D> & {
    children: ReactNode
    staticValues?: any
    transformValues?: (fields: T) => T
}

export const createValidator = <T extends Fields>(against: T) => (
    values: T
) => {
    // Translate class-validator style errors to a map of fields to error string arrays.
    const classValidatorErrors = validateSync(
        plainToClassFromExist(against, values)
    )
    return classValidatorErrors.reduce(
        (errors, current) => {
            return {
                ...errors,
                ...{
                    ...{
                        [current.property]: Object.values(current.constraints)
                    }
                }
            }
        },
        {} as FormErrors<T>
    )
}

export const Form = <T extends Fields, D = any>({
    children,
    validator,
    submit,
    staticValues,
    transformValues
}: FormProps<T, D>) => {
    const formContext = useForm()
    const [submitState, setSubmitState] = useState<ResponseState>({})
    const validate =
        typeof validator === "function"
            ? (validator as ((fields: T) => FormErrors<T>))
            : createValidator<T>(validator)
    return (
        <FormContext
            validate={validate}
            submit={async () => {
                let values = {
                    ...formContext.getValues(),
                    ...staticValues
                } as T
                values = transformValues ? transformValues(values) : values
                if (
                    Object.values(validate(values)).every(
                        errors => !errors || !errors.length
                    )
                ) {
                    setSubmitState({ loading: true })
                    const response = (await submit(values)) || {}
                    setSubmitState({ ...response, loading: false })
                }
            }}
            submitState={submitState}
            touched={[]}
            {...formContext}
        >
            {children}
        </FormContext>
    )
}