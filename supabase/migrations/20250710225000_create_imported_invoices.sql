-- Create imported_invoices table to track uploaded PDF files
CREATE TABLE IF NOT EXISTS imported_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'sent_to_webhook', 'processed', 'error')),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_imported_invoices_uploaded_at ON imported_invoices(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_imported_invoices_status ON imported_invoices(status);

-- Enable RLS
ALTER TABLE imported_invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own imported invoices" ON imported_invoices
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own imported invoices" ON imported_invoices
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own imported invoices" ON imported_invoices
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_imported_invoices_updated_at 
  BEFORE UPDATE ON imported_invoices 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 