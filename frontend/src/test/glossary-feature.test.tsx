import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GlossaryFeature } from "@/features/glossary/glossary-feature";

describe("GlossaryFeature", () => {
  it("renders categories and filters terms by search text", async () => {
    const user = userEvent.setup();
    render(<GlossaryFeature />);

    expect(screen.getByRole("heading", { name: "Glossário" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Termos de Hidráulica" })).toBeInTheDocument();
    expect(screen.getByText("Número de Reynolds (Re)")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Pesquisar no glossário" }), "npsh");

    expect(screen.getByText("NPSH Disponível (NPSHd)")).toBeInTheDocument();
    expect(screen.queryByText("Número de Reynolds (Re)")).not.toBeInTheDocument();
  });
});
