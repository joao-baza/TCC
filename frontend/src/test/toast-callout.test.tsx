import { fireEvent, render, screen } from "@testing-library/react";

const toastMocks = vi.hoisted(() => ({
  dismiss: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    dismiss: toastMocks.dismiss,
  },
}));

import { ToastCallout } from "@/components/toast-callout";

describe("ToastCallout", () => {
  beforeEach(() => {
    toastMocks.dismiss.mockReset();
  });

  it("renders a soft success callout and dismisses itself", () => {
    render(<ToastCallout id="toast-1" message="Exemplo carregado com sucesso." variant="success" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Sucesso")).toBeInTheDocument();
    expect(screen.getByText("Exemplo carregado com sucesso.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /fechar alerta/i }));

    expect(toastMocks.dismiss).toHaveBeenCalledWith("toast-1");
  });

  it("uses a stronger but still soft treatment for errors", () => {
    render(<ToastCallout id="toast-2" message="Resposta vazia da API." variant="error" />);

    expect(screen.getByText("Erro")).toBeInTheDocument();
    expect(screen.getByText("Resposta vazia da API.")).toBeInTheDocument();
  });
});
